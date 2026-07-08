import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createDisplayUrl } from "@/lib/storage-signed";

const BUCKET = "missionary-photos";

/**
 * Returns the admin-uploaded cover/background image for a missionary as a
 * signed display URL, or null if none exists.
 */
export function useMissionaryCover(missionaryId: string) {
  return useQuery({
    queryKey: ["missionary_cover", missionaryId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("missionary_photos")
        .select("cover_url")
        .eq("missionary_id", missionaryId)
        .maybeSingle();
      if (error) throw error;
      if (!data?.cover_url) return null;
      return createDisplayUrl(BUCKET, data.cover_url);
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
