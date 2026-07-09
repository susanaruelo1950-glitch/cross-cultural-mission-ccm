import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, ImagePlus, X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const BUCKET = "missionary-photos";
const MAX_MB = 5;

interface Props {
  missionaryId: string;
  missionaryName: string;
  /** Called after a successful upload with the new storage path. */
  onUploaded?: (path: string) => void;
}

/**
 * Admin / scoped-coordinator upload for a missionary profile photo. Stores
 * the storage path in `missionary_photos.photo_url` (private bucket, resolved
 * to a signed URL for display).
 */
export function MissionaryPhotoUpload({ missionaryId, missionaryName, onUploaded }: Props) {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [url, setUrl] = useState("");

  const mut = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${missionaryId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("missionary_photos")
        .upsert(
          { missionary_id: missionaryId, photo_url: path, updated_at: new Date().toISOString() },
          { onConflict: "missionary_id" },
        );
      if (dbErr) throw dbErr;
      return path;
    },
    onSuccess: (path) => {
      toast.success(`Photo updated for ${missionaryName}.`);
      qc.invalidateQueries({ queryKey: ["missionary_photo", missionaryId] });
      qc.invalidateQueries({ queryKey: ["signed-url", BUCKET] });
      setPreview(null);
      setSelected(null);
      onUploaded?.(path);
    },
    onError: (e: Error) => {
      const msg = /row-level|permission|not authorized/i.test(e.message)
        ? "You don't have permission to edit this missionary's photo."
        : /exceeded|too large|payload/i.test(e.message)
          ? `Image is too large. Please use a file under ${MAX_MB} MB.`
          : e.message || "Upload failed. Please try again.";
      toast.error(msg);
    },
    onSettled: () => setBusy(false),
  });

  if (!canEdit) return null;

  function pickFile(f: File) {
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, or WebP).");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Image is too large. Max ${MAX_MB} MB.`);
      return;
    }
    setSelected(f);
    setPreview(URL.createObjectURL(f));
  }

  async function importFromUrl() {
    const raw = url.trim();
    if (!/^https?:\/\//i.test(raw)) {
      toast.error("Please paste a valid image URL (starting with http:// or https://).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(raw);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("URL does not point to an image.");
      if (blob.size > MAX_MB * 1024 * 1024) throw new Error(`Image is too large. Max ${MAX_MB} MB.`);
      const ext = (blob.type.split("/")[1] || "jpg").split("+")[0];
      const filename = `from-url.${ext}`;
      const file = new File([blob], filename, { type: blob.type });
      setShowUrl(false);
      setUrl("");
      mut.mutate(file);
    } catch (e) {
      setBusy(false);
      const msg = e instanceof Error ? e.message : "Could not import that URL.";
      toast.error(
        /CORS|Failed to fetch|NetworkError/i.test(msg)
          ? "That host blocks direct downloads. Save the image and upload the file instead."
          : msg,
      );
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`Choose photo for ${missionaryName}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) pickFile(f);
        }}
      />

      {preview ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border p-2">
          <img
            src={preview}
            alt=""
            className="h-14 w-14 rounded-xl object-cover"
            width={56}
            height={56}
          />
          <div className="min-w-0 flex-1 text-xs">
            <div className="truncate font-medium">{selected?.name}</div>
            <div className="text-muted-foreground">
              {selected ? `${(selected.size / 1024).toFixed(0)} KB` : ""}
            </div>
          </div>
          <Button
            size="sm"
            className="rounded-full"
            disabled={busy}
            onClick={() => {
              if (!selected) return;
              setBusy(true);
              mut.mutate(selected);
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {busy ? "Uploading…" : "Save photo"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full"
            disabled={busy}
            aria-label="Cancel"
            onClick={() => {
              setPreview(null);
              setSelected(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="h-4 w-4" /> Update photo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              disabled={busy}
              onClick={() => setShowUrl((v) => !v)}
              aria-expanded={showUrl}
            >
              <Link2 className="h-4 w-4" /> {showUrl ? "Cancel URL" : "Paste image URL"}
            </Button>
            <span className="hidden text-xs text-muted-foreground sm:inline-flex sm:items-center sm:gap-1">
              <ImagePlus className="h-3 w-3" /> JPG/PNG/WebP, up to {MAX_MB} MB
            </span>
          </div>
          {showUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="url"
                inputMode="url"
                placeholder="https://example.com/latest-photo.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={busy}
                className="h-9 flex-1 min-w-[220px]"
                aria-label="Image URL"
              />
              <Button
                size="sm"
                className="rounded-full"
                disabled={busy || !url.trim()}
                onClick={importFromUrl}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {busy ? "Importing…" : "Import & save"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
