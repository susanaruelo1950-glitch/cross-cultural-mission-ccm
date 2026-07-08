import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ImagePlus, Trash2, Calendar, X, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { IMAGE_MIME, safeStoragePath, validateFile } from "@/lib/upload-validation";

interface Props {
  missionaryId: string;
  missionaryName: string;
}

interface Update {
  id: string;
  missionary_id: string;
  title: string;
  summary: string | null;
  body: string | null;
  image_url: string | null;
  report_date: string;
  created_at: string;
  created_by: string | null;
}

const BUCKET = "ministry-updates";
const MAX_MB = 5;

export function MinistryUpdates({ missionaryId, missionaryName }: Props) {
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: updates, isLoading } = useQuery({
    queryKey: ["ministry_updates", missionaryId],
    queryFn: async (): Promise<Update[]> => {
      const { data, error } = await supabase
        .from("ministry_updates")
        .select("*")
        .eq("missionary_id", missionaryId)
        .order("report_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ministry_updates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Update deleted.");
      qc.invalidateQueries({ queryKey: ["ministry_updates", missionaryId] });
    },
    onError: (e: Error) =>
      toast.error(
        /row-level|permission/i.test(e.message)
          ? "You don't have permission to delete this update."
          : e.message,
      ),
  });

  return (
    <Card className="card-soft p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-xl font-semibold">Ministry Updates</h3>
          <p className="text-xs text-muted-foreground">
            Monthly stories, praises and challenges from {missionaryName}.
          </p>
        </div>
      </div>

      {canEdit ? <UpdateForm missionaryId={missionaryId} /> : null}

      <div className="mt-5 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading updates…
          </div>
        ) : !updates || updates.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No updates yet"
            description={
              canEdit
                ? "Use the form above to post the first monthly update."
                : "Ministry updates will appear here once posted."
            }
          />
        ) : (
          updates.map((u) => (
            <article key={u.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {new Date(u.report_date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <h4 className="font-display text-base font-semibold">{u.title}</h4>
                </div>
                {isAdmin ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Delete this update?")) del.mutate(u.id);
                    }}
                    aria-label="Delete update"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
              {u.image_url ? <UpdateImage path={u.image_url} title={u.title} /> : null}
              {u.summary ? (
                <p className="mt-3 text-sm font-medium text-foreground/90">{u.summary}</p>
              ) : null}
              {u.body ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                  {u.body}
                </p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </Card>
  );
}

function UpdateImage({ path, title }: { path: string; title: string }) {
  const { data: url, isLoading } = useSignedUrl(BUCKET, path);
  if (isLoading) {
    return (
      <div className="mt-3 flex h-40 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading image…
      </div>
    );
  }
  if (!url) return null;
  return (
    <img
      src={url}
      alt={title}
      className="mt-3 max-h-80 w-full rounded-xl object-cover"
      loading="lazy"
    />
  );
}

function UpdateForm({ missionaryId }: { missionaryId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  function pickFile(f: File | null) {
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Image too large. Max ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required.");
    setBusy(true);
    try {
      let image_path: string | null = null;
      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${missionaryId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          });
        if (upErr) throw upErr;
        image_path = path;
      }

      const { error } = await supabase.from("ministry_updates").insert({
        missionary_id: missionaryId,
        title: title.trim(),
        summary: summary.trim() || null,
        body: body.trim() || null,
        image_url: image_path,
      });
      if (error) throw error;
      toast.success("Update posted.");
      setTitle("");
      setSummary("");
      setBody("");
      pickFile(null);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["ministry_updates", missionaryId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post update.";
      toast.error(
        /row-level|permission/i.test(msg)
          ? "You don't have permission to post updates for this missionary."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="rounded-full" size="sm">
        <Plus className="h-4 w-4" /> Post ministry update
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
      aria-label="Post ministry update"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="mu-title">Title *</Label>
        <Input id="mu-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="mu-summary">Short summary</Label>
        <Input
          id="mu-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="One-line highlight (optional)"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="mu-body">Full update</Label>
        <Textarea
          id="mu-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Attendance, baptisms, testimonies, prayer requests, challenges…"
          className="min-h-[140px]"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="mu-photo" className="flex items-center gap-1.5">
          <ImagePlus className="h-4 w-4" /> Photo (optional, max {MAX_MB} MB)
        </Label>
        <Input
          id="mu-photo"
          type="file"
          accept="image/*"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {previewUrl ? (
          <div className="relative mt-1 w-fit">
            <img
              src={previewUrl}
              alt=""
              className="max-h-40 rounded-xl object-cover"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-7 w-7 rounded-full bg-background/80"
              onClick={() => pickFile(null)}
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy} className="rounded-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {busy ? "Posting…" : "Post update"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-full">
          Cancel
        </Button>
      </div>
    </form>
  );
}
