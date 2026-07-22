import { useQuery } from "@tanstack/react-query";
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
 * The global realtime bridge (`use-global-realtime`) invalidates the
 * ["ministry_updates", "list"] key on INSERT / UPDATE / DELETE.
 */
export function useMinistryUpdatesList() {
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
