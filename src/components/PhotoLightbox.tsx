import { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LightboxItem {
  src: string;
  alt: string;
}

/**
 * Facebook-style photo viewer. Supports a single image (via `src`/`alt`) or
 * a gallery (via `items`/`index`) with keyboard/click prev-next navigation,
 * click-to-cycle zoom, drag when zoomed, mouse-wheel zoom, and Esc to close.
 */
export function PhotoLightbox({
  src,
  alt,
  items,
  index: indexProp,
  open,
  onClose,
}: {
  src?: string;
  alt?: string;
  items?: LightboxItem[];
  index?: number;
  open: boolean;
  onClose: () => void;
}) {
  const gallery: LightboxItem[] =
    items && items.length > 0
      ? items
      : src
        ? [{ src, alt: alt ?? "" }]
        : [];
  const [index, setIndex] = useState(indexProp ?? 0);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const hasMany = gallery.length > 1;
  const current = gallery[Math.min(index, gallery.length - 1)];

  const goPrev = useCallback(() => {
    if (!hasMany) return;
    setIndex((i) => (i - 1 + gallery.length) % gallery.length);
    reset();
  }, [gallery.length, hasMany, reset]);
  const goNext = useCallback(() => {
    if (!hasMany) return;
    setIndex((i) => (i + 1) % gallery.length);
    reset();
  }, [gallery.length, hasMany, reset]);

  useEffect(() => {
    if (!open) return;
    setIndex(indexProp ?? 0);
    reset();
  }, [open, indexProp, reset]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "+" || e.key === "=") setScale((s) => Math.min(6, s + 0.5));
      else if (e.key === "-") setScale((s) => Math.max(1, s - 0.5));
      else if (e.key === "0") reset();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, reset, goPrev, goNext]);

  if (!open || !current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.alt}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onWheel={(e) => {
        e.preventDefault();
        setScale((s) => Math.max(1, Math.min(6, s + (e.deltaY < 0 ? 0.25 : -0.25))));
      }}
    >
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <Button size="icon" variant="secondary" className="rounded-full" aria-label="Zoom out"
          onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(1, s - 0.5)); }}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="secondary" className="rounded-full" aria-label="Zoom in"
          onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(6, s + 0.5)); }}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="secondary" className="rounded-full" aria-label="Reset zoom"
          onClick={(e) => { e.stopPropagation(); reset(); }}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="secondary" className="rounded-full" aria-label="Close"
          onClick={(e) => { e.stopPropagation(); onClose(); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {hasMany ? (
        <>
          <Button
            size="icon"
            variant="secondary"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full"
            aria-label="Previous photo"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full"
            aria-label="Next photo"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {index + 1} / {gallery.length}
          </div>
        </>
      ) : null}

      <img
        src={current.src}
        alt={current.alt}
        draggable={false}
        onClick={(e) => {
          e.stopPropagation();
          setScale((s) => (s >= 3 ? 1 : s + 1));
          if (scale >= 3) { setTx(0); setTy(0); }
        }}
        onMouseDown={(e) => {
          if (scale === 1) return;
          e.stopPropagation();
          dragging.current = { x: e.clientX - tx, y: e.clientY - ty };
        }}
        onMouseMove={(e) => {
          if (!dragging.current) return;
          setTx(e.clientX - dragging.current.x);
          setTy(e.clientY - dragging.current.y);
        }}
        onMouseUp={() => { dragging.current = null; }}
        onMouseLeave={() => { dragging.current = null; }}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: dragging.current ? "none" : "transform 150ms ease",
          cursor: scale > 1 ? (dragging.current ? "grabbing" : "grab") : "zoom-in",
        }}
        className="max-h-[92vh] max-w-[95vw] select-none rounded-lg shadow-2xl"
      />
    </div>
  );
}
