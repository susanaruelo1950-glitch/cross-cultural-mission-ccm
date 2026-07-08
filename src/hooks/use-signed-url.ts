import { useQuery } from "@tanstack/react-query";
import { createDisplayUrl } from "@/lib/storage-signed";

/**
 * Resolve a stored path or legacy public URL into a usable display URL for a
 * private storage bucket. Caches aggressively and retries transient network
 * failures so supporters on slow connections see fewer loading delays.
 */
export function useSignedUrl(bucket: string, pathOrUrl: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", bucket, pathOrUrl ?? ""],
    queryFn: async () => {
      if (!pathOrUrl) return null;
      const url = await createDisplayUrl(bucket, pathOrUrl);
      if (!url) throw new Error("Failed to sign URL");
      return url;
    },
    enabled: Boolean(pathOrUrl),
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
