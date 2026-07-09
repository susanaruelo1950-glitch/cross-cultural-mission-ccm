import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setCloudMissionaries, type Missionary } from "@/lib/mission-data";

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
        return;
      }
      const rows: Missionary[] = [];
      const deletedIds: string[] = [];
      const deletedNames: string[] = [];
      for (const r of data ?? []) {
        const raw = r.data as (Missionary & { __deleted?: boolean; fullName?: string }) | null;
        if (!raw || typeof raw !== "object") continue;
        if (raw.__deleted) {
          deletedIds.push(r.id);
          if (raw.fullName) deletedNames.push(raw.fullName);
          continue;
        }
        rows.push({ ...(raw as Missionary), id: r.id });
      }
      setCloudMissionaries(rows, { ids: deletedIds, names: deletedNames });
    }

    refresh();
    const channel = supabase
      .channel("missionary_extras_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "missionary_extras" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);
}
