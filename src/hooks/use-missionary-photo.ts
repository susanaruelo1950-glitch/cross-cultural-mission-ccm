import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the admin-uploaded photo override for a missionary, or null if
 * none exists (caller should fall back to the JSON-bundled photo).
 */
export function useMissionaryPhoto(missionaryId: string) {
  return useQuery({
    queryKey: ["missionary_photo", missionaryId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("missionary_photos")
        .select("photo_url")
        .eq("missionary_id", missionaryId)
        .maybeSingle();
      if (error) throw error;
      return data?.photo_url ?? null;
    },
    staleTime: 60_000,
  });
}
