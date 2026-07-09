import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export interface FieldConflict {
  field: string;
  mine: unknown;
  theirs: unknown;
  base: unknown;
}

export interface MergePreview<T extends object> {
  /** Auto-merged (I changed one field, they changed another) */
  autoMerged: T;
  /** True conflicts — both sides changed the same field to different values */
  conflicts: FieldConflict[];
}

/**
 * 3-way merge between a common base, my draft, and the current remote row.
 * - If only one side changed a field → take that side.
 * - If both changed to the same value → no conflict.
 * - If both changed to different values → conflict entry.
 */
export function computeMerge<T extends object>(
  base: T,
  mine: T,
  theirs: T,
): MergePreview<T> {
  const keys = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(theirs)]);
  const merged: Record<string, unknown> = { ...theirs };
  const conflicts: FieldConflict[] = [];
  for (const k of keys) {
    const b = (base as Record<string, unknown>)[k];
    const m = (mine as Record<string, unknown>)[k];
    const t = (theirs as Record<string, unknown>)[k];
    const mChanged = JSON.stringify(b) !== JSON.stringify(m);
    const tChanged = JSON.stringify(b) !== JSON.stringify(t);
    if (mChanged && tChanged) {
      if (JSON.stringify(m) === JSON.stringify(t)) {
        merged[k] = m;
      } else {
        conflicts.push({ field: k, mine: m, theirs: t, base: b });
        merged[k] = t; // default: theirs; overridden by dialog choice
      }
    } else if (mChanged) {
      merged[k] = m;
    } else {
      merged[k] = t;
    }
  }
  return { autoMerged: merged as T, conflicts };
}

function display(v: unknown): string {
  if (v === null || v === undefined || v === "") return "— empty —";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

export function ConflictMergeDialog<T extends object>({
  preview,
  onResolve,
  onCancel,
}: {
  preview: MergePreview<T>;
  onResolve: (resolved: T) => void;
  onCancel: () => void;
}) {
  const [choices, setChoices] = useState<Record<string, "mine" | "theirs">>(
    () => Object.fromEntries(preview.conflicts.map((c) => [c.field, "mine" as const])),
  );

  const autoMergedCount = useMemo(() => {
    let n = 0;
    for (const k of Object.keys(preview.autoMerged)) {
      if (!preview.conflicts.some((c) => c.field === k)) n++;
    }
    return n;
  }, [preview]);

  function finish() {
    const out = { ...preview.autoMerged } as Record<string, unknown>;
    for (const c of preview.conflicts) {
      out[c.field] = choices[c.field] === "theirs" ? c.theirs : c.mine;
    }
    onResolve(out as T);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Merge conflicting edits"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <Card className="max-h-[85vh] w-full max-w-2xl overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="font-display text-lg font-semibold">Merge conflicting edits</h2>
          <Badge variant="secondary" className="ml-auto rounded-full text-[10px]">
            {autoMergedCount} auto-merged · {preview.conflicts.length} to resolve
          </Badge>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {preview.conflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No conflicting fields — your changes and theirs touch different fields and will be
              combined safely.
            </p>
          ) : (
            <ul className="space-y-3">
              {preview.conflicts.map((c) => (
                <li key={c.field} className="rounded-xl border border-border p-3">
                  <div className="mb-2 flex items-baseline justify-between">
                    <div className="font-medium capitalize">{c.field.replace(/_/g, " ")}</div>
                    <span className="text-[10px] text-muted-foreground">
                      base: {display(c.base)}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label
                      className={`cursor-pointer rounded-lg border p-2 text-sm ${
                        choices[c.field] === "mine" ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={c.field}
                          checked={choices[c.field] === "mine"}
                          onChange={() => setChoices((p) => ({ ...p, [c.field]: "mine" }))}
                        />
                        <span className="text-xs font-medium">Keep mine</span>
                      </div>
                      <div className="mt-1 break-words text-xs text-muted-foreground">
                        {display(c.mine)}
                      </div>
                    </label>
                    <label
                      className={`cursor-pointer rounded-lg border p-2 text-sm ${
                        choices[c.field] === "theirs" ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={c.field}
                          checked={choices[c.field] === "theirs"}
                          onChange={() => setChoices((p) => ({ ...p, [c.field]: "theirs" }))}
                        />
                        <span className="text-xs font-medium">Keep theirs</span>
                      </div>
                      <div className="mt-1 break-words text-xs text-muted-foreground">
                        {display(c.theirs)}
                      </div>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={finish}>Save merged</Button>
        </div>
      </Card>
    </div>
  );
}
