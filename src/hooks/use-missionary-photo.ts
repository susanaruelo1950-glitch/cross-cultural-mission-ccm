import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createDisplayUrl } from "@/lib/storage-signed";

const BUCKET = "missionary-photos";

/**
 * Returns the admin-uploaded photo override for a missionary as a signed
 * display URL, or null if none exists (caller should fall back to the
 * JSON-bundled photo).
 */
export function useMissionaryPhoto(missionaryId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["missionary_photo", missionaryId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("missionary_photos")
        .select("photo_url")
        .eq("missionary_id", missionaryId)
        .maybeSingle();
      if (error) throw error;
      if (!data?.photo_url) return null;
      return createDisplayUrl(BUCKET, data.photo_url);
    },
    enabled: options?.enabled ?? true,
    // Aggressive caching for low-bandwidth: keep photo URLs fresh for
    // 30 minutes and hold them in memory for 24 hours between visits.
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
