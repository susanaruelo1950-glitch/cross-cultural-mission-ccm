/**
 * Compute a sortable month key (YYYY-MM) from an ISO date string.
 * Used by the order-verification log so admins can confirm items are
 * bucketed into the month their filename / report_date implies.
 */
export function monthKey(iso: string | null | undefined): string {
  if (!iso) return "0000-00";
  const s = String(iso);
  // Fast path: ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "0000-00";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map((x) => parseInt(x, 10));
  if (!y || !m) return key;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
}
