import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Global realtime bridge for every admin-editable table.
 * - Subscribes once (mounted in AppLayout).
 * - Invalidates matching React Query keys.
 * - Emits a `gc-realtime-change` window event with { table, event }
 *   so UI can show toasts / live-updates badges.
 * - Exposes connection state via `useRealtimeStatus()`.
 */
const TABLE_TO_KEYS: Record<string, string[][]> = {
  ministry_updates: [["ministry_updates"]],
  thank_you_letters: [["thank_you_letters"], ["thank_you_letters_admin"]],
  prayer_requests_db: [["prayer_requests_db"]],
  scriptures: [["scriptures"]],
  coordinator_assignments: [["coordinator_assignments"]],
  missionary_photos: [["missionary_photo"], ["missionary_cover"]],
  // Directory structure (also drives use-directory.ts)
  areas: [["dir", "areas"]],
  phases: [["dir", "phases"]],
  regions: [["dir", "regions"]],
  provinces: [["dir", "provinces"]],
  missionary_area_map: [["dir", "areas"], ["dir", "missionaries"]],
  // missionary_extras is handled by useMissionaryRealtime (merges into seed data)
};

export type RealtimeStatus = "connecting" | "live" | "offline";

let status: RealtimeStatus = "connecting";
const statusListeners = new Set<() => void>();
function setStatus(next: RealtimeStatus) {
  if (status === next) return;
  status = next;
  for (const l of statusListeners) l();
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

    // Debounce buffer — coalesces bursts (e.g. bulk import, poor network
    // buffering many events at once) into a single invalidation per table.
    const pending = new Map<string, RealtimeChangeDetail>();
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const FLUSH_MS = 250;

    function flush() {
      flushTimer = null;
      const tables = Array.from(pending.keys());
      const details = Array.from(pending.values());
      pending.clear();
      for (const table of tables) {
        for (const key of TABLE_TO_KEYS[table] ?? []) qc.invalidateQueries({ queryKey: key });
      }
      // Dispatch one event per unique table with the most recent payload.
      for (const detail of details) {
        window.dispatchEvent(new CustomEvent("gc-realtime-change", { detail }));
      }
    }

    function connect() {
      setStatus("connecting");
      channel = supabase.channel("global_admin_sync");
      for (const table of Object.keys(TABLE_TO_KEYS)) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            const detail: RealtimeChangeDetail = {
              table,
              event: payload.eventType as RealtimeChangeDetail["event"],
              new: (payload.new ?? null) as Record<string, unknown> | null,
              old: (payload.old ?? null) as Record<string, unknown> | null,
            };
            // Keep only the latest event per table within the debounce window.
            pending.set(table, detail);
            if (flushTimer) clearTimeout(flushTimer);
            flushTimer = setTimeout(flush, FLUSH_MS);
          },
        );
      }
      channel.subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
      });
    }

    connect();

    // Auto-reconnect when the tab regains network / focus
    function reconnect() {
      if (!channel) return;
      supabase.removeChannel(channel);
      connect();
    }
    function onOnline() { reconnect(); }
    function onVisible() { if (document.visibilityState === "visible" && status === "offline") reconnect(); }
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);
}
