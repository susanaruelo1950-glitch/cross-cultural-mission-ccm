/**
 * Shared client-side validation helpers for storage uploads.
 * Enforce type + size limits and produce a safe, collision-resistant filename
 * before touching Supabase Storage or the database.
 */

export const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const PDF_MIME = ["application/pdf"];
export const LETTER_MIME = [...IMAGE_MIME, ...PDF_MIME];

export const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export interface ValidateOptions {
  allowed: string[];
  maxMb: number;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateFile(f: File, opts: ValidateOptions): ValidationResult {
  if (!f) return { ok: false, reason: "No file selected." };
  const type = (f.type || "").toLowerCase();
  const matches =
    opts.allowed.includes(type) ||
    (opts.allowed.some((a) => a.startsWith("image/")) && type.startsWith("image/"));
  if (!matches) {
    return { ok: false, reason: `Unsupported file type (${type || "unknown"}).` };
  }
  if (f.size <= 0) return { ok: false, reason: "File is empty." };
  if (f.size > opts.maxMb * 1024 * 1024) {
    return { ok: false, reason: `File is too large. Max ${opts.maxMb} MB.` };
  }
  return { ok: true };
}

/**
 * Build a safe storage path: strip unsafe chars from the base name, force a
 * whitelisted extension, and prefix with a timestamp so uploads don't collide.
 */
export function safeStoragePath(folder: string, file: File, suffix?: string): string {
  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  const mimeExt = EXT_BY_MIME[(file.type || "").toLowerCase()];
  const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : (mimeExt ?? "bin");
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "file";
  const stamp = `${Date.now()}${suffix ? `-${suffix}` : ""}`;
  const clean = `${base}-${stamp}.${ext}`;
  const safeFolder = folder.replace(/[^A-Za-z0-9._\-/]+/g, "-");
  return `${safeFolder}/${clean}`;
}
