import { useEffect, useRef, useState } from "react";
import { Loader2, Download, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
// pdfjs worker via vite ?url
// eslint-disable-next-line import/no-unresolved
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  title: string;
}

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (o: { scale: number }) => { width: number; height: number };
    render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
  }>;
};

/**
 * Supporter-friendly PDF viewer. Renders a thumbnail rail plus a large
 * page canvas so supporters can scan a signed letter without opening a
 * new tab per document.
 */
export function PdfPreviewDialog({ open, onOpenChange, url, title }: Props) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [pages, setPages] = useState<number>(0);
  const [current, setCurrent] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCurrent(1);
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        const loadingTask = pdfjs.getDocument({ url });
        const d = (await loadingTask.promise) as unknown as PdfDoc;
        if (cancelled) return;
        setDoc(d);
        setPages(d.numPages);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load PDF.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  // Render current page to the main canvas.
  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(current);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d");
      if (!ctx || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, current]);

  // Render thumbnails once.
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    (async () => {
      for (let i = 1; i <= doc.numPages; i++) {
        if (cancelled) return;
        const el = thumbRefs.current[i];
        if (!el) continue;
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });
        const ctx = el.getContext("2d");
        if (!ctx) continue;
        el.width = viewport.width;
        el.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="truncate">{title}</DialogTitle>
          <DialogDescription>
            Page {current} of {pages || "–"}. Use the thumbnails to jump between pages.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading PDF…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-border/60 bg-muted/40 p-2">
              <ul className="space-y-2">
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <li key={n}>
                    <button
                      type="button"
                      onClick={() => setCurrent(n)}
                      className={`block w-full overflow-hidden rounded-md border ${
                        n === current ? "border-primary ring-2 ring-primary/40" : "border-border/60"
                      } bg-background`}
                      aria-label={`Go to page ${n}`}
                      aria-current={n === current}
                    >
                      <canvas
                        ref={(el) => {
                          thumbRefs.current[n] = el;
                        }}
                        className="block h-auto w-full"
                      />
                      <div className="py-1 text-center text-[10px] text-muted-foreground">{n}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-border/60 bg-muted/30 p-2">
              <canvas ref={canvasRef} className="mx-auto block h-auto max-w-full" />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={current <= 1}
              onClick={() => setCurrent((c) => Math.max(1, c - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={current >= pages}
              onClick={() => setCurrent((c) => Math.min(pages, c + 1))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {url ? (
            <div className="flex gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" /> Open in new tab
              </a>
              <a
                href={url}
                download
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <Download className="h-4 w-4" /> Download
              </a>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
