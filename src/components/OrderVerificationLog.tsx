import { useMemo, useState } from "react";
import { ListOrdered, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthKey, monthLabel } from "@/lib/month-key";

export interface OrderVerifyItem {
  id: string;
  title: string;
  /** report_date or letter_date (ISO YYYY-MM-DD) */
  date: string;
  created_at?: string;
}

interface Props {
  items: OrderVerifyItem[];
  dateFieldLabel: string; // e.g. "report_date"
  label?: string;
}

/**
 * Admin-only verification log confirming date ordering.
 * Groups items by their computed month key and lists each item's parsed month
 * alongside the raw date field, so admins can spot any ordering surprise.
 */
export function OrderVerificationLog({ items, dateFieldLabel, label = "Verify order" }: Props) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, OrderVerifyItem[]>();
    for (const it of items) {
      const k = monthKey(it.date);
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
    // Sort groups newest-first
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([key, list]) => ({ key, list }));
  }, [items]);

  // Detect any items that appear out-of-order relative to their neighbours
  // (i.e. a later month appearing after an earlier one in the source array).
  const outOfOrder = useMemo(() => {
    const bad = new Set<string>();
    for (let i = 1; i < items.length; i++) {
      const prev = monthKey(items[i - 1].date);
      const cur = monthKey(items[i].date);
      // Source is descending — so prev >= cur is expected. Flag if cur > prev.
      if (cur > prev) bad.add(items[i].id);
    }
    return bad;
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="mt-3">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 rounded-full px-2 text-xs text-muted-foreground"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <ListOrdered className="h-3.5 w-3.5" />
        {label} · {items.length} items · {groups.length} months
        {outOfOrder.size > 0 ? (
          <span className="ml-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
            {outOfOrder.size} out of order
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="mt-2 rounded-xl border border-border/60 bg-card/60 p-3 text-xs">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Grouped by parsed month key · sorted newest → oldest
          </div>
          <ul className="space-y-2">
            {groups.map((g) => (
              <li key={g.key}>
                <div className="flex items-baseline gap-2 border-b border-border/40 pb-0.5">
                  <span className="font-mono text-[11px] text-muted-foreground">{g.key}</span>
                  <span className="font-medium">{monthLabel(g.key)}</span>
                  <span className="text-[11px] text-muted-foreground">· {g.list.length}</span>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {g.list.map((it) => (
                    <li key={it.id} className="flex items-center justify-between gap-2">
                      <span className="truncate" title={it.title}>
                        {outOfOrder.has(it.id) ? (
                          <span className="mr-1 rounded bg-destructive/10 px-1 py-0.5 text-[10px] text-destructive">
                            !
                          </span>
                        ) : null}
                        {it.title || "(untitled)"}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {dateFieldLabel}={it.date}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
