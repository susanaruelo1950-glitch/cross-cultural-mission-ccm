import { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Facebook-style photo viewer: click backdrop or ✕ to close,
 * click image to cycle zoom (1× → 2× → 3× → 1×), drag when zoomed,
 * mouse-wheel/pinch zooms, Esc closes.
 */
export function PhotoLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    reset();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(6, s + 0.5));
      if (e.key === "-") setScale((s) => Math.max(1, s - 0.5));
      if (e.key === "0") reset();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, reset]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onWheel={(e) => {
        e.preventDefault();
        setScale((s) => Math.max(1, Math.min(6, s + (e.deltaY < 0 ? 0.25 : -0.25))));
      }}
    >
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          aria-label="Zoom out"
          onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(1, s - 0.5)); }}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          aria-label="Zoom in"
          onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(6, s + 0.5)); }}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          aria-label="Reset zoom"
          onClick={(e) => { e.stopPropagation(); reset(); }}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          aria-label="Close"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <img
        src={src}
        alt={alt}
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
