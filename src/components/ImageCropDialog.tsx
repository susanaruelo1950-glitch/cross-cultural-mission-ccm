import { useCallback, useState, type ReactNode } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, Check, X } from "lucide-react";
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

/**
 * Reusable crop dialog. Consumer supplies a preview image URL (e.g. from
 * `URL.createObjectURL`) and receives a cropped `File` back through
 * `onCropped`. Aspect ratio defaults to 16:5 which matches the profile hero.
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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onComplete = useCallback((_: Area, px: Area) => setPixels(px), []);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
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
        </div>
        <div className="mt-2 grid gap-1">
          <label className="text-xs font-medium text-muted-foreground">Zoom</label>
          <Slider
            value={[zoom]}
            min={1}
            max={4}
            step={0.05}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            aria-label="Zoom"
          />
        </div>
        <DialogFooter className="gap-2">
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
