/**
 * Parse a date hint out of an uploaded file's name so bulk-uploaded photos
 * order chronologically instead of collapsing to "upload time".
 *
 * Recognised patterns (case-insensitive):
 *   - ISO:              2025-02-14, 2025_02_14, 2025.02.14
 *   - Year + month:     2025-02, 202502
 *   - Month name:       "February 2025", "feb-2025", "Feb 14, 2025", "14 Feb 2025"
 *   - DMY / MDY:        14-02-2025, 02/14/2025 (year 4 digits — no ambiguity vs ISO)
 *
 * Returns an ISO date string (YYYY-MM-DD) or null when no confident match.
 * The caller falls back to `File.lastModified` when this returns null.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function toISO(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

export function parseFilenameDate(name: string): string | null {
  const base = name.replace(/\.[^.]+$/, "").toLowerCase();

  // 1. YYYY-MM-DD (any separator)
  const iso = base.match(/(20\d{2})[\-_.\/ ]?(\d{2})[\-_.\/ ]?(\d{2})/);
  if (iso) {
    const r = toISO(+iso[1], +iso[2], +iso[3]);
    if (r) return r;
  }

  // 2. Month name + year, optional day
  const monthPattern = Object.keys(MONTHS).join("|");
  const re1 = new RegExp(`(\\d{1,2})[\\s\\-_,]+(${monthPattern})[\\s\\-_,]+(20\\d{2})`, "i");
  const re2 = new RegExp(`(${monthPattern})[\\s\\-_,]+(\\d{1,2})[\\s\\-_,]+(20\\d{2})`, "i");
  const re3 = new RegExp(`(${monthPattern})[\\s\\-_,]+(20\\d{2})`, "i");

  let mm = base.match(re1);
  if (mm) {
    const r = toISO(+mm[3], MONTHS[mm[2]], +mm[1]);
    if (r) return r;
  }
  mm = base.match(re2);
  if (mm) {
    const r = toISO(+mm[3], MONTHS[mm[1]], +mm[2]);
    if (r) return r;
  }
  mm = base.match(re3);
  if (mm) {
    const r = toISO(+mm[2], MONTHS[mm[1]], 1);
    if (r) return r;
  }

  // 3. YYYY-MM only
  const ym = base.match(/(20\d{2})[\-_.\/ ](\d{1,2})(?!\d)/);
  if (ym) {
    const r = toISO(+ym[1], +ym[2], 1);
    if (r) return r;
  }

  // 4. DD-MM-YYYY or MM-DD-YYYY (ambiguous — prefer DMY when first > 12)
  const dmy = base.match(/(\d{1,2})[\-_.\/](\d{1,2})[\-_.\/](20\d{2})/);
  if (dmy) {
    const a = +dmy[1];
    const b = +dmy[2];
    const y = +dmy[3];
    const [d, m] = a > 12 ? [a, b] : b > 12 ? [b, a] : [a, b]; // default DMY-ish
    const r = toISO(y, m, d);
    if (r) return r;
  }

  return null;
}

/**
 * Best-effort date for a bulk-uploaded file:
 *  1. filename hint,
 *  2. File.lastModified,
 *  3. today.
 */
export function bulkFileDate(file: File): string {
  const fromName = parseFilenameDate(file.name);
  if (fromName) return fromName;
  const ts = file.lastModified;
  if (ts && Number.isFinite(ts)) {
    const d = new Date(ts);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}
