import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LiveUpdate {
  id: string;
  missionary_id: string;
  title: string;
  summary: string | null;
  body: string | null;
  image_url: string | null;
  report_date: string | null;
  created_at: string;
}

/**
 * Single source of truth for the ministry-updates live feed.
 * Both the dashboard "Updates" badge and the /reports list read from this
 * query so the count can never point to empty results.
 *
 * In addition to the global realtime bridge, this hook opens its own
 * dedicated `ministry_updates` channel so new posts appear instantly on
 * the dashboard and /reports without waiting for a reconnect or a manual
 * refresh. The channel invalidates the query on every INSERT / UPDATE /
 * DELETE and also patches the cache optimistically for INSERTs so the
 * badge count bumps immediately even before the refetch resolves.
 */
export function useMinistryUpdatesList() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`ministry_updates_live_${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ministry_updates" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const row = payload.new as LiveUpdate;
            qc.setQueryData<LiveUpdate[]>(["ministry_updates", "list"], (prev) => {
              if (!prev) return prev;
              if (prev.some((r) => r.id === row.id)) return prev;
              return [row, ...prev];
            });
          } else if (payload.eventType === "DELETE" && payload.old) {
            const oldRow = payload.old as { id?: string };
            if (oldRow.id) {
              qc.setQueryData<LiveUpdate[]>(["ministry_updates", "list"], (prev) =>
                prev ? prev.filter((r) => r.id !== oldRow.id) : prev,
              );
            }
          } else if (payload.eventType === "UPDATE" && payload.new) {
            const row = payload.new as LiveUpdate;
            qc.setQueryData<LiveUpdate[]>(["ministry_updates", "list"], (prev) =>
              prev ? prev.map((r) => (r.id === row.id ? { ...r, ...row } : r)) : prev,
            );
          }
          qc.invalidateQueries({ queryKey: ["ministry_updates"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: ["ministry_updates", "list"],
    queryFn: async (): Promise<LiveUpdate[]> => {
      // Page through all rows so the dashboard badge and /reports feed
      // never silently cap out as the ministry grows past 500 updates.
      const PAGE = 1000;
      const all: LiveUpdate[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("ministry_updates")
          .select("id, missionary_id, title, summary, body, image_url, report_date, created_at")
          .order("report_date", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        all.push(...rows);
        if (rows.length < PAGE) break;
      }
      return all;
    },
    staleTime: 15_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
