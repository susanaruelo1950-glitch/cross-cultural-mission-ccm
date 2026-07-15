import { CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FileStatus = "pending" | "uploading" | "success" | "error" | "skipped";

export interface FileResult {
  name: string;
  size: number;
  status: FileStatus;
  message?: string;
  /** ISO date parsed from filename or file.lastModified — surfaced so admins can
   *  confirm the row will land in the right month. */
  computedDate?: string;
  computedMonth?: string;
}

interface Props {
  results: FileResult[];
  onClose?: () => void;
  title?: string;
}

/**
 * Compact per-file progress + result panel for bulk uploads.
 * Shows: filename, status icon, computed month/date, and any error message.
 */
export function BulkUploadProgress({ results, onClose, title = "Bulk upload" }: Props) {
  if (results.length === 0) return null;
  const total = results.length;
  const done = results.filter((r) => r.status === "success" || r.status === "error" || r.status === "skipped").length;
  const ok = results.filter((r) => r.status === "success").length;
  const fail = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const running = done < total;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-2 rounded-xl border border-border/60 bg-card/70 p-3 text-xs shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
          <span>{title}</span>
          <span className="text-muted-foreground">
            {done}/{total} · {ok} ok{fail > 0 ? ` · ${fail} failed` : ""}{skipped > 0 ? ` · ${skipped} skipped` : ""}
          </span>
        </div>
        {!running && onClose ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClose}
            aria-label="Dismiss upload results"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {/* Progress bar */}
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.round((done / total) * 100)}%` }}
        />
      </div>

      <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
        {results.map((r, i) => (
          <li
            key={`${r.name}-${i}`}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted/40"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <StatusIcon status={r.status} />
              <span className="truncate" title={r.name}>{r.name}</span>
              {r.computedMonth ? (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {r.computedMonth}
                </span>
              ) : null}
            </div>
            {r.status === "error" || r.status === "skipped" ? (
              <span className="shrink-0 truncate text-[11px] text-destructive" title={r.message}>
                {r.message ?? "failed"}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === "success") return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />;
  if (status === "error") return <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />;
  if (status === "skipped") return <XCircle className="h-3.5 w-3.5 shrink-0 text-amber-500" />;
  if (status === "uploading") return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />;
  return <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/40" />;
}
