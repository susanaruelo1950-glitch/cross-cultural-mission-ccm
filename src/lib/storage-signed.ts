import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts a storage object path from either a raw path, a `getPublicUrl`
 * URL, or an existing signed URL. Used so we can (re-)sign URLs for private
 * buckets even for legacy rows that stored a public-style URL.
 */
export function extractStoragePath(bucket: string, value: string): string {
  if (!value) return value;
  const publicMarker = `/object/public/${bucket}/`;
  const signMarker = `/object/sign/${bucket}/`;
  const pi = value.indexOf(publicMarker);
  if (pi >= 0) return decodeURIComponent(value.slice(pi + publicMarker.length).split("?")[0]);
  const si = value.indexOf(signMarker);
  if (si >= 0) return decodeURIComponent(value.slice(si + signMarker.length).split("?")[0]);
  return value; // treat as an already-clean path
}

const DEFAULT_EXPIRES = 60 * 60 * 24 * 365; // 1 year

export async function createDisplayUrl(
  bucket: string,
  pathOrUrl: string,
  expiresIn: number = DEFAULT_EXPIRES,
): Promise<string | null> {
  if (!pathOrUrl) return null;
  const path = extractStoragePath(bucket, pathOrUrl);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) {
    console.warn(`createSignedUrl failed for ${bucket}/${path}:`, error.message);
    return null;
  }
  return data.signedUrl;
}
