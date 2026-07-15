import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Live head-counts for dashboard cards. React Query caches the number; the
 * global realtime bridge (`use-global-realtime`) invalidates these keys when
 * INSERT / UPDATE / DELETE arrive on the underlying table, so cards update
 * without a refresh.
 */
async function count(table: "prayer_requests_db" | "ministry_updates" | "thank_you_letters"): Promise<number> {
  const { count: n, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.warn("[live-counts]", table, error.message);
    return 0;
  }
  return n ?? 0;
}

export function usePrayerCount() {
  return useQuery({
    queryKey: ["prayer_requests_db", "count"],
    queryFn: () => count("prayer_requests_db"),
    staleTime: 60_000,
  });
}

/**
 * @deprecated Prefer `useMinistryUpdatesList().data?.length` on surfaces that
 * link to /reports, so the badge count and the list can never diverge.
 * Kept for other non-list surfaces that only need a head count.
 */
export function useMinistryUpdateCount() {
  return useQuery({
    queryKey: ["ministry_updates", "count"],
    queryFn: () => count("ministry_updates"),
    staleTime: 60_000,
  });
}

export function useLetterCount() {
  return useQuery({
    queryKey: ["thank_you_letters", "count"],
    queryFn: () => count("thank_you_letters"),
    staleTime: 60_000,
  });
}
