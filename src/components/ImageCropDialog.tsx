import { useCallback, useEffect, useState, type ReactNode } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, Check, X, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { cropToFile } from "@/lib/crop-image";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  filename: string;
  aspect?: number;
  title?: string;
  description?: ReactNode;
  busy?: boolean;
  onCropped: (file: File) => void | Promise<void>;
}

const INITIAL_CROP = { x: 0, y: 0 };
const INITIAL_ZOOM = 1;

/**
 * Reusable crop dialog with keyboard controls (arrows nudge crop, +/- zoom,
 * R resets), always-visible aspect ratio badge, and an explicit Reset button.
 */
export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  filename,
  aspect = 16 / 5,
  title = "Crop image",
  description,
  busy = false,
  onCropped,
}: Props) {
  const [crop, setCrop] = useState(INITIAL_CROP);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onComplete = useCallback((_: Area, px: Area) => setPixels(px), []);

  function reset() {
    setCrop(INITIAL_CROP);
    setZoom(INITIAL_ZOOM);
  }

  // Reset internal state when the dialog is (re-)opened with a new image.
  useEffect(() => {
    if (open) reset();
  }, [open, imageSrc]);

  // Keyboard shortcuts while the dialog is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const step = e.shiftKey ? 20 : 5;
      switch (e.key) {
        case "ArrowLeft":
          setCrop((c) => ({ ...c, x: c.x + step })); e.preventDefault(); break;
        case "ArrowRight":
          setCrop((c) => ({ ...c, x: c.x - step })); e.preventDefault(); break;
        case "ArrowUp":
          setCrop((c) => ({ ...c, y: c.y + step })); e.preventDefault(); break;
        case "ArrowDown":
          setCrop((c) => ({ ...c, y: c.y - step })); e.preventDefault(); break;
        case "+":
        case "=":
          setZoom((z) => Math.min(4, +(z + 0.1).toFixed(2))); e.preventDefault(); break;
        case "-":
        case "_":
          setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2))); e.preventDefault(); break;
        case "r":
        case "R":
          reset(); e.preventDefault(); break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function apply() {
    if (!pixels) return;
    setSaving(true);
    try {
      const cropped = await cropToFile(imageSrc, pixels, filename);
      await onCropped(cropped);
    } finally {
      setSaving(false);
    }
  }

  const ratioLabel = aspect === 16 / 5
    ? "16:5"
    : aspect === 1
    ? "1:1"
    : aspect === 16 / 9
    ? "16:9"
    : aspect.toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle>{title}</DialogTitle>
            <Badge variant="secondary" className="rounded-full" aria-label={`Aspect ratio ${ratioLabel}`}>
              {ratioLabel}
            </Badge>
          </div>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-muted sm:h-80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onComplete}
            objectFit="contain"
            restrictPosition
          />
          <div
            className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur"
            aria-hidden
          >
            Preview {ratioLabel}
          </div>
        </div>
        <div className="mt-2 grid gap-1">
          <label className="text-xs font-medium text-muted-foreground">Zoom · {zoom.toFixed(2)}×</label>
          <Slider
            value={[zoom]}
            min={1}
            max={4}
            step={0.05}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            aria-label="Zoom"
          />
          <p className="text-[11px] text-muted-foreground">
            Keyboard: arrows nudge, Shift+arrow moves faster, + / − zooms, R resets.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={reset}
            disabled={busy || saving}
            type="button"
          >
            <RotateCcw className="h-4 w-4" /> Reset crop
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)} disabled={busy || saving}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button className="rounded-full" onClick={apply} disabled={!pixels || busy || saving}>
            {busy || saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {busy || saving ? "Applying…" : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
