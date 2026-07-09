import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordRealtimeSyncError, setCloudMissionaries, type Missionary } from "@/lib/mission-data";

/**
 * Loads admin-added missionaries from Supabase and keeps them in sync via
 * Realtime. Mount ONCE (in AppLayout). Any change on `missionary_extras`
 * refreshes the merged directory across all open tabs / devices instantly.
 *
 * Rows whose `data` contains `{ __deleted: true }` are treated as tombstones —
 * they hide the matching missionary (including seed rows) from every viewer.
 */
export function useMissionaryRealtime() {
  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data, error } = await supabase
        .from("missionary_extras")
        .select("id, data")
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.warn("[missionary-realtime] fetch failed:", error.message);
        recordRealtimeSyncError("missionary_extras", error.message);
        toast.error("Missionary sync refresh failed", { description: error.message });
        return;
      }
      const rows: Missionary[] = [];
      const deletedIds: string[] = [];
      const deletedNames: string[] = [];
      for (const r of data ?? []) {
        const raw = r.data as (Missionary & { __deleted?: boolean; fullName?: string; duplicateOf?: string }) | null;
        if (!raw || typeof raw !== "object") continue;
        if (raw.__deleted) {
          deletedIds.push(r.id);
          if (raw.fullName && !raw.duplicateOf) deletedNames.push(raw.fullName);
          continue;
        }
        rows.push({ ...(raw as Missionary), id: r.id });
      }
      setCloudMissionaries(rows.reverse(), { ids: deletedIds, names: deletedNames });
    }

    refresh();
    const channel = supabase
      .channel("missionary_extras_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "missionary_extras" },
        (payload) => {
          window.dispatchEvent(new CustomEvent("gc-realtime-change", {
            detail: {
              table: "missionary_extras",
              event: payload.eventType,
              new: payload.new ?? null,
              old: payload.old ?? null,
            },
          }));
          void refresh();
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          const reason = status === "CHANNEL_ERROR" ? "Channel error" : status === "TIMED_OUT" ? "Connection timed out" : "Channel closed";
          recordRealtimeSyncError("missionary_extras", reason);
          toast.error("Missionary realtime sync failed", { description: `${reason}. Reopen the app or wait for reconnection.` });
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);
}
