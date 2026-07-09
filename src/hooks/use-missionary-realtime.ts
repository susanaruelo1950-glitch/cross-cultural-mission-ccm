import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setCloudMissionaries, type Missionary } from "@/lib/mission-data";

/**
 * Loads admin-added missionaries from Supabase and keeps them in sync via
 * Realtime. Mount ONCE (in AppLayout). Any change on `missionary_extras`
 * refreshes the merged directory across all open tabs / devices instantly.
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
      const rows = (data ?? [])
        .map((r) => {
          const m = r.data as Missionary | null;
          if (!m || typeof m !== "object") return null;
          return { ...m, id: r.id };
        })
        .filter(Boolean) as Missionary[];
      setCloudMissionaries(rows);
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
