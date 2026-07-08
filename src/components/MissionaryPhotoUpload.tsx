import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const BUCKET = "missionary-photos";

interface Props {
  missionaryId: string;
  missionaryName: string;
  /** Called after a successful upload with the new public URL. */
  onUploaded?: (url: string) => void;
}

/**
 * Admin / scoped-coordinator upload of a missionary profile photo. The
 * file is stored in the `missionary-photos` bucket under `<id>/<ts>.<ext>`
 * and the public URL is upserted into `missionary_photos`.
 */
export function MissionaryPhotoUpload({ missionaryId, missionaryName, onUploaded }: Props) {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const mut = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${missionaryId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase
        .from("missionary_photos")
        .upsert(
          { missionary_id: missionaryId, photo_url: url, updated_at: new Date().toISOString() },
          { onConflict: "missionary_id" },
        );
      if (dbErr) throw dbErr;
      return url;
    },
    onSuccess: (url) => {
      toast.success(`Photo updated for ${missionaryName}.`);
      qc.invalidateQueries({ queryKey: ["missionary_photo", missionaryId] });
      onUploaded?.(url);
    },
    onError: (e: Error) => {
      const msg = e.message.includes("row-level")
        ? "You don't have permission to edit this missionary's photo."
        : e.message;
      toast.error(msg);
    },
    onSettled: () => setBusy(false),
  });

  if (!canEdit) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`Upload photo for ${missionaryName}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 5 * 1024 * 1024) {
            toast.error("Please pick an image under 5 MB.");
            return;
          }
          setBusy(true);
          mut.mutate(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        {busy ? "Uploading…" : "Update photo"}
      </Button>
      <span className="hidden text-xs text-muted-foreground sm:inline-flex sm:items-center sm:gap-1">
        <ImagePlus className="h-3 w-3" /> JPG/PNG, up to 5 MB
      </span>
    </div>
  );
}
