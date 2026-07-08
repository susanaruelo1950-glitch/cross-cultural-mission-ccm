import { useQuery } from "@tanstack/react-query";
import { createDisplayUrl } from "@/lib/storage-signed";

/**
 * Resolve a stored path or legacy public URL into a usable display URL for a
 * private storage bucket. Returns `null` while loading or on failure.
 */
export function useSignedUrl(bucket: string, pathOrUrl: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", bucket, pathOrUrl ?? ""],
    queryFn: () => (pathOrUrl ? createDisplayUrl(bucket, pathOrUrl) : Promise.resolve(null)),
    enabled: Boolean(pathOrUrl),
    staleTime: 30 * 60 * 1000,
  });
}
