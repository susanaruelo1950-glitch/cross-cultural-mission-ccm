import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordRealtimeSyncError } from "@/lib/mission-data";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Global realtime bridge for every admin-editable table.
 * - Subscribes once (mounted in AppLayout).
 * - Invalidates matching React Query keys AND refetches active queries.
 * - Emits a `gc-realtime-change` window event with { table, event }
 *   so UI can show toasts / live-updates badges.
 * - Re-subscribes when auth state changes (so signed-in users start
 *   receiving events for RLS-protected tables like `documents`).
 * - Watchdog reconnects on network wake, visibility, or long silence.
 * - Exposes connection state via `useRealtimeStatus()`.
 */
const TABLE_TO_KEYS: Record<string, string[][]> = {
  ministry_updates: [["ministry_updates"]],
  support_receipts: [["support_receipts"]],
  thank_you_letters: [["thank_you_letters"], ["thank_you_letters_admin"]],
  prayer_requests_db: [["prayer_requests_db"]],
  scriptures: [["scriptures"]],
  coordinator_assignments: [["coordinator_assignments"]],
  missionary_photos: [["missionary_photo"], ["missionary_cover"]],
  announcements: [["announcements"]],
  partners: [["partners"]],
  areas: [["dir", "areas"]],
  phases: [["dir", "phases"]],
  regions: [["dir", "regions"]],
  provinces: [["dir", "provinces"]],
  missionary_area_map: [["dir", "areas"], ["dir", "missionaries"]],
  documents: [["documents"]],
  activity_log: [["activity_log"]],
  prayer_events: [["prayer_events"], ["prayer_requests_db"]],
  profiles: [["profiles"]],
  user_roles: [["user_roles"], ["admin_users"]],
  // missionary_extras is handled by useMissionaryRealtime (merges into seed data)
};

export type RealtimeStatus = "connecting" | "live" | "offline";

let status: RealtimeStatus = "connecting";
const statusListeners = new Set<() => void>();
let lastRealtimeErrorAt = 0;
function setStatus(next: RealtimeStatus) {
  if (status === next) return;
  status = next;
  for (const l of statusListeners) l();
}

function reportRealtimeError(id: string, reason: string) {
  setStatus("offline");
  recordRealtimeSyncError(id, reason);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gc-realtime-error", { detail: { id, reason, at: Date.now() } }));
  }
  const now = Date.now();
  if (now - lastRealtimeErrorAt > 30_000) {
    lastRealtimeErrorAt = now;
    toast.error("Realtime sync connection failed", {
      description: `${reason}. The app will keep trying to reconnect.`,
    });
  }
}

export function useRealtimeStatus(): RealtimeStatus {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => status,
    () => "connecting" as RealtimeStatus,
  );
}

export interface RealtimeChangeDetail {
  table: string;
  event: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

export function useGlobalRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let disposed = false;
    let lastEventAt = Date.now();
    let watchdog: ReturnType<typeof setInterval> | null = null;
    let backoff = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let wasOffline = false;

    // Debounce buffer — coalesces bursts (e.g. bulk import, poor network
    // buffering many events at once) into a single invalidation per table.
    // Per-row events are still dispatched immediately so the notification
    // bell never drops an INSERT during a burst.
    const pending = new Set<string>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const FLUSH_MS = 250;

    function flush() {
      flushTimer = null;
      const tables = Array.from(pending);
      pending.clear();
      for (const table of tables) {
        for (const key of TABLE_TO_KEYS[table] ?? []) {
          qc.invalidateQueries({ queryKey: key });
        }
      }
    }


    function refetchAllActive() {
      // On reconnect after a gap, we may have missed events — force a
      // refresh of every subscribed query so the UI catches up.
      qc.refetchQueries({ type: "active" }).catch(() => {});
    }

    async function connect() {
      if (disposed) return;
      setStatus("connecting");

      // Unique channel name per attempt so an orphaned prior channel on the
      // server can't collide with the new subscription.
      const name = `global_admin_sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const ch = supabase.channel(name);
      channel = ch;

      for (const table of Object.keys(TABLE_TO_KEYS)) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            lastEventAt = Date.now();
            const detail: RealtimeChangeDetail = {
              table,
              event: payload.eventType as RealtimeChangeDetail["event"],
              new: (payload.new ?? null) as Record<string, unknown> | null,
              old: (payload.old ?? null) as Record<string, unknown> | null,
            };
            // Dispatch immediately so per-row consumers (NotificationBell)
            // never lose an event to burst debouncing.
            window.dispatchEvent(new CustomEvent("gc-realtime-change", { detail }));
            pending.add(table);
            if (flushTimer) clearTimeout(flushTimer);
            flushTimer = setTimeout(flush, FLUSH_MS);

          },
        );
      }

      ch.subscribe((s) => {
        if (disposed || ch !== channel) return;
        if (s === "SUBSCRIBED") {
          setStatus("live");
          lastEventAt = Date.now();
          backoff = 0;
          if (wasOffline) {
            wasOffline = false;
            refetchAllActive();
          }
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          wasOffline = true;
          reportRealtimeError(
            "global_admin_sync",
            s === "CHANNEL_ERROR" ? "Channel error" : s === "TIMED_OUT" ? "Connection timed out" : "Channel closed",
          );
          scheduleReconnect();
        }
      });
    }

    function scheduleReconnect() {
      if (disposed || reconnectTimer) return;
      backoff = Math.min(backoff ? backoff * 2 : 1000, 30_000);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void reconnect();
      }, backoff);
    }

    async function reconnect() {
      if (disposed) return;
      const prev = channel;
      channel = null;
      if (prev) {
        try { await supabase.removeChannel(prev); } catch { /* noop */ }
      }
      void connect();
    }

    void connect();

    // Watchdog: if we haven't heard from the server in 90s while claiming
    // to be "live", assume a silent disconnect and reconnect. Also detects
    // stuck "connecting" states.
    watchdog = setInterval(() => {
      if (disposed) return;
      const idleMs = Date.now() - lastEventAt;
      if (status === "connecting" && idleMs > 20_000) {
        wasOffline = true;
        void reconnect();
      } else if (status === "live" && idleMs > 120_000) {
        // Silent — force a probe reconnect so React Query re-syncs.
        wasOffline = true;
        void reconnect();
      }
    }, 15_000);

    function onOnline() { wasOffline = true; void reconnect(); }
    function onVisible() {
      if (document.visibilityState === "visible") {
        if (status === "offline") void reconnect();
        else refetchAllActive();
      }
    }
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    // Re-subscribe when auth state changes so RLS-protected subscriptions
    // (documents, activity_log, profiles, user_roles, etc.) start / stop
    // delivering events for the newly signed-in / signed-out user.
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        wasOffline = true;
        void reconnect();
      }
    });

    return () => {
      disposed = true;
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      if (flushTimer) clearTimeout(flushTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (watchdog) clearInterval(watchdog);
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);
}
