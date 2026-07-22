import { useState } from "react";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type OcrConfidence = "high" | "medium" | "low" | null;

export interface OcrSuggestion {
  key: string;
  label: string;
  value: string;
  confidence: OcrConfidence;
  multiline?: boolean;
}

interface Props {
  overallConfidence?: OcrConfidence;
  suggestions: OcrSuggestion[];
  note?: string | null;
  onAccept: (key: string, value: string) => void;
  onDismiss: (key: string) => void;
  onAcceptAll: () => void;
  onDismissAll: () => void;
}

function ConfBadge({ c }: { c: OcrConfidence }) {
  if (!c) return null;
  const cls =
    c === "high"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300"
      : c === "medium"
        ? "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300"
        : "bg-destructive/10 text-destructive border-destructive/30";
  return (
    <span
      className={
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
        cls
      }
    >
      {c} confidence
    </span>
  );
}

/**
 * Displays AI-detected fields with per-field confidence badges and lets the
 * user selectively accept, edit, or dismiss each suggestion instead of the
 * OCR autofilling everything at once.
 */
export function OcrReviewPanel({
  overallConfidence,
  suggestions,
  note,
  onAccept,
  onDismiss,
  onAcceptAll,
  onDismissAll,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, string | undefined>>({});

  if (suggestions.length === 0) {
    return note ? (
      <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs text-foreground/80">
        <div className="flex items-start gap-1.5">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          <span>{note}</span>
        </div>
      </div>
    ) : null;
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>
            AI detected {suggestions.length} field{suggestions.length === 1 ? "" : "s"} — review before applying
          </span>
          <ConfBadge c={overallConfidence ?? null} />
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 rounded-full text-xs"
            onClick={onAcceptAll}
          >
            <Check className="h-3 w-3" /> Accept all
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-full text-xs"
            onClick={onDismissAll}
          >
            <X className="h-3 w-3" /> Dismiss all
          </Button>
        </div>
      </div>
      {note ? <p className="text-[11px] text-muted-foreground">{note}</p> : null}
      <ul className="space-y-2">
        {suggestions.map((s) => {
          const draft = drafts[s.key];
          const isEditing = draft !== undefined;
          return (
            <li key={s.key} className="rounded-lg border border-border/60 bg-background/60 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </span>
                  <ConfBadge c={s.confidence} />
                </div>
                <div className="flex gap-1">
                  {!isEditing ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 rounded-full px-2 text-[11px]"
                      onClick={() => setDrafts((p) => ({ ...p, [s.key]: s.value }))}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-6 rounded-full px-2 text-[11px]"
                    onClick={() => {
                      const v = isEditing ? (draft ?? "") : s.value;
                      onAccept(s.key, v);
                      setDrafts((p) => {
                        const n = { ...p };
                        delete n[s.key];
                        return n;
                      });
                    }}
                  >
                    <Check className="h-3 w-3" /> Use
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 rounded-full px-2 text-[11px]"
                    onClick={() => onDismiss(s.key)}
                    aria-label={`Dismiss ${s.label}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {isEditing ? (
                s.multiline ? (
                  <Textarea
                    className="mt-1 min-h-[80px] text-sm"
                    value={draft ?? ""}
                    onChange={(e) => setDrafts((p) => ({ ...p, [s.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    className="mt-1 text-sm"
                    value={draft ?? ""}
                    onChange={(e) => setDrafts((p) => ({ ...p, [s.key]: e.target.value }))}
                  />
                )
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/85">
                  {s.value || <span className="italic text-muted-foreground">(empty)</span>}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
