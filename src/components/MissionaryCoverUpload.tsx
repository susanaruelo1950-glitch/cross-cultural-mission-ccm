import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const BUCKET = "missionary-photos";
const MAX_MB = 8;

interface Props {
  missionaryId: string;
  missionaryName: string;
}

/**
 * Admin / scoped-coordinator upload for the profile cover/background image
 * (e.g. a family photo). Stores the storage path under `missionary_photos.cover_url`.
 */
export function MissionaryCoverUpload({ missionaryId, missionaryName }: Props) {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<File | null>(null);

  const mut = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${missionaryId}/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("missionary_photos")
        .upsert(
          {
            missionary_id: missionaryId,
            // photo_url is NOT NULL — preserve any existing value with a fallback
            photo_url: (await currentPhotoUrl(missionaryId)) ?? path,
            cover_url: path,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "missionary_id" },
        );
      if (dbErr) throw dbErr;
      return path;
    },
    onSuccess: () => {
      toast.success(`Cover updated for ${missionaryName}.`);
      qc.invalidateQueries({ queryKey: ["missionary_cover", missionaryId] });
      qc.invalidateQueries({ queryKey: ["signed-url", BUCKET] });
      setPreview(null);
      setSelected(null);
    },
    onError: (e: Error) => {
      const msg = /row-level|permission/i.test(e.message)
        ? "You don't have permission to edit this cover."
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

  return (
    <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`Choose cover photo for ${missionaryName}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) pickFile(f);
        }}
      />
      {preview ? (
        <div className="flex items-center gap-2 rounded-full bg-background/95 p-1 pl-3 shadow-lift backdrop-blur">
          <img src={preview} alt="" className="h-8 w-14 rounded-md object-cover" />
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
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {busy ? "Uploading…" : "Save cover"}
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
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full bg-background/85 backdrop-blur hover:bg-background"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" /> Upload family/background photo
        </Button>
      )}
    </div>
  );
}

async function currentPhotoUrl(missionaryId: string): Promise<string | null> {
  const { data } = await supabase
    .from("missionary_photos")
    .select("photo_url")
    .eq("missionary_id", missionaryId)
    .maybeSingle();
  return data?.photo_url ?? null;
}
