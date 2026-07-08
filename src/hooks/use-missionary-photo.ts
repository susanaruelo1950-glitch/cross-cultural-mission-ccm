import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createDisplayUrl } from "@/lib/storage-signed";

const BUCKET = "missionary-photos";

/**
 * Returns the admin-uploaded photo override for a missionary as a signed
 * display URL, or null if none exists (caller should fall back to the
 * JSON-bundled photo).
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
      if (!data?.photo_url) return null;
      return createDisplayUrl(BUCKET, data.photo_url);
    },
    staleTime: 5 * 60 * 1000,
  });
}
