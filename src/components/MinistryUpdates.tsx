import { useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDisplayUrl } from "@/lib/storage-signed";

import { Loader2, Plus, ImagePlus, Trash2, Calendar, X, Pencil, Save, Files } from "lucide-react";
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
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { IMAGE_MIME, safeStoragePath, validateFile } from "@/lib/upload-validation";
import { bulkFileDate } from "@/lib/parse-filename-date";

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
const MAX_MB = 25;
const BULK_CONCURRENCY = 4;

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
        .order("report_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("ministry_updates")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Nothing was deleted. You may not have permission, or the item was already removed.");
      }
    },
    onSuccess: () => {
      toast.success("Update deleted.");
      qc.invalidateQueries({ queryKey: ["ministry_updates"] });
      qc.invalidateQueries({ queryKey: ["ministry_updates", missionaryId] });
    },
    onError: (e: Error) =>
      toast.error(
        /row-level|permission/i.test(e.message)
          ? "You don't have permission to delete this update."
          : e.message,
      ),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const withImages = useMemo(
    () => (updates ?? []).filter((u) => !!u.image_url),
    [updates],
  );

  // Group consecutive photo-only updates that share the same (title, report_date)
  // — these come from a bulk upload and should render as one collage tile.
  type Group =
    | { kind: "single"; update: Update }
    | { kind: "collage"; title: string; report_date: string; items: Update[] };
  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    for (const u of updates ?? []) {
      const isPhotoOnly = !!u.image_url && !u.summary && !u.body;
      const prev = out[out.length - 1];
      if (
        isPhotoOnly &&
        prev &&
        prev.kind === "collage" &&
        prev.title === u.title &&
        prev.report_date === u.report_date
      ) {
        prev.items.push(u);
      } else if (isPhotoOnly) {
        out.push({ kind: "collage", title: u.title, report_date: u.report_date, items: [u] });
      } else {
        out.push({ kind: "single", update: u });
      }
    }
    // Collapse single-item collages back into a single card for a cleaner layout.
    return out.map((g) =>
      g.kind === "collage" && g.items.length === 1
        ? ({ kind: "single", update: g.items[0] } as Group)
        : g,
    );
  }, [updates]);

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

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <UpdateForm missionaryId={missionaryId} />
          <BulkUpdateUpload missionaryId={missionaryId} />
        </div>
      ) : null}

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
          groups.map((g) => {
            if (g.kind === "collage") {
              return (
                <article
                  key={`collage-${g.report_date}-${g.title}-${g.items[0].id}`}
                  className="rounded-2xl border border-border/60 bg-card p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {new Date(g.report_date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </div>
                      <h4 className="font-display text-base font-semibold">
                        {g.title}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          · {g.items.length} photos
                        </span>
                      </h4>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                    {g.items.map((u) => (
                      <CollageThumb
                        key={u.id}
                        path={u.image_url as string}
                        title={u.title}
                        canDelete={isAdmin}
                        onDelete={() => {
                          if (confirm("Delete this photo?")) del.mutate(u.id);
                        }}
                        onOpen={() => {
                          const idx = withImages.findIndex((x) => x.id === u.id);
                          setLightboxIndex(idx >= 0 ? idx : 0);
                        }}
                      />
                    ))}
                  </div>
                </article>
              );
            }
            const u = g.update;
            return (
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
                  {canEdit ? (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(editingId === u.id ? null : u.id)}
                        aria-label="Edit update"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
                  ) : null}
                </div>
                {editingId === u.id ? (
                  <UpdateEditForm
                    update={u}
                    onClose={() => setEditingId(null)}
                    onSaved={() => {
                      setEditingId(null);
                      qc.invalidateQueries({ queryKey: ["ministry_updates", missionaryId] });
                    }}
                  />
                ) : (
                  <>
                    {u.image_url ? (
                      <UpdateImageThumb
                        path={u.image_url}
                        title={u.title}
                        onOpen={() => {
                          const idx = withImages.findIndex((x) => x.id === u.id);
                          setLightboxIndex(idx >= 0 ? idx : 0);
                        }}
                      />
                    ) : null}
                    {u.summary ? (
                      <p className="mt-3 text-sm font-medium text-foreground/90">{u.summary}</p>
                    ) : null}
                    {u.body ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                        {u.body}
                      </p>
                    ) : null}
                  </>
                )}
              </article>
            );
          })
        )}
      </div>

      {lightboxIndex !== null && withImages.length > 0 ? (
        <UpdatesLightbox
          items={withImages.map((u) => ({ path: u.image_url as string, title: u.title }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </Card>
  );
}


function UpdateEditForm({
  update,
  onClose,
  onSaved,
}: {
  update: Update;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(update.title);
  const [summary, setSummary] = useState(update.summary ?? "");
  const [body, setBody] = useState(update.body ?? "");

  const key = ["ministry_updates", update.missionary_id] as const;

  const save = useMutation({
    mutationFn: async (patch: { title: string; summary: string | null; body: string | null }) => {
      const { error } = await supabase.from("ministry_updates").update(patch).eq("id", update.id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Update[] | undefined>(key);
      qc.setQueryData<Update[] | undefined>(key, (prev) =>
        prev?.map((u) => (u.id === update.id ? { ...u, ...patch } : u)),
      );
      return { previous };
    },
    onError: (err, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
      toast.error(err instanceof Error ? `Update failed: ${err.message}. Reverted.` : "Update failed. Reverted.");
    },
    onSuccess: () => {
      toast.success("Update saved.");
      onSaved();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  function submit() {
    if (!title.trim()) return toast.error("Title is required.");
    save.mutate({
      title: title.trim(),
      summary: summary.trim() || null,
      body: body.trim() || null,
    });
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={200} />
      <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short summary" maxLength={280} />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Full update" className="min-h-[120px]" maxLength={10000} />
      <div className="flex gap-2">
        <Button size="sm" className="rounded-full" disabled={save.isPending} onClick={submit}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onClose}>
          <X className="h-4 w-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}


function UpdateImageThumb({
  path,
  title,
  onOpen,
}: {
  path: string;
  title: string;
  onOpen: () => void;
}) {
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
    <button
      type="button"
      className="mt-3 block w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={onOpen}
      aria-label={`View full photo for ${title}`}
    >
      <img
        src={url}
        alt={title}
        className="max-h-80 w-full object-cover transition-transform hover:scale-[1.01]"
        loading="lazy"
      />
    </button>
  );
}

/**
 * Square collage tile — clickable thumbnail with an optional admin delete button
 * that shows on hover / focus. Used to render bulk-uploaded photo batches.
 */
function CollageThumb({
  path,
  title,
  canDelete,
  onOpen,
  onDelete,
}: {
  path: string;
  title: string;
  canDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { data: url, isLoading } = useSignedUrl(BUCKET, path);
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
      {isLoading || !url ? (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`View full photo: ${title}`}
        >
          <img
            src={url}
            alt={title}
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
            loading="lazy"
          />
        </button>
      )}
      {canDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-destructive opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Delete photo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Signs every ministry-update image in parallel and shows them in a gallery
 * lightbox with prev/next navigation.
 */
function UpdatesLightbox({
  items,
  index,
  onClose,
}: {
  items: { path: string; title: string }[];
  index: number;
  onClose: () => void;
}) {
  const results = useQueries({
    queries: items.map((it) => ({
      queryKey: ["signed-url", BUCKET, it.path],
      queryFn: async () => {
        const url = await createDisplayUrl(BUCKET, it.path);
        if (!url) throw new Error("Failed to sign URL");
        return url;
      },
      staleTime: 30 * 60 * 1000,
    })),
  });
  const lightboxItems = items
    .map((it, i) => ({ src: (results[i]?.data as string | undefined) ?? "", alt: it.title }))
    .filter((it) => it.src);
  if (lightboxItems.length === 0) return null;
  const clamped = Math.min(index, lightboxItems.length - 1);
  return (
    <PhotoLightbox
      open
      onClose={onClose}
      items={lightboxItems}
      index={clamped}
    />
  );
}



function BulkUpdateUpload({ missionaryId }: { missionaryId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      const check = validateFile(f, { allowed: IMAGE_MIME, maxMb: MAX_MB });
      if (!check.ok) {
        toast.error(`Skipped ${f.name}: ${check.reason}`);
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;
    setBusy(true);
    setProgress({ done: 0, total: valid.length });
    let successes = 0;
    let failures = 0;
    let firstError: string | null = null;

    const doOne = async (f: File, i: number) => {
      try {
        const path = safeStoragePath(missionaryId, f, `bulk-${i}`);
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, {
          cacheControl: "3600",
          upsert: false,
          contentType: f.type || undefined,
        });
        if (upErr) throw upErr;
        const title = f.name.replace(/\.[^.]+$/, "").slice(0, 200) || "Ministry update photo";
        const report_date = bulkFileDate(f);
        const { error: dbErr } = await supabase.from("ministry_updates").insert({
          missionary_id: missionaryId,
          title,
          image_url: path,
          report_date,
        });
        if (dbErr) throw dbErr;
        successes++;
      } catch (err) {
        failures++;
        const msg = err instanceof Error ? err.message : String(err);
        if (!firstError) firstError = `${f.name}: ${msg}`;
        console.error("bulk ministry update upload failed for", f.name, err);
      } finally {
        setProgress((p) => (p ? { done: p.done + 1, total: p.total } : p));
      }
    };

    try {
      // Bounded concurrency — much faster than sequential, safer than unbounded.
      let cursor = 0;
      const workers = Array.from({ length: Math.min(BULK_CONCURRENCY, valid.length) }, async () => {
        while (cursor < valid.length) {
          const i = cursor++;
          await doOne(valid[i], i);
        }
      });
      await Promise.all(workers);

      if (successes > 0) {
        toast.success(`Uploaded ${successes} photo${successes === 1 ? "" : "s"}.`);
        qc.invalidateQueries({ queryKey: ["ministry_updates"] });
        qc.invalidateQueries({ queryKey: ["ministry_updates", missionaryId] });
      }
      if (failures > 0) {
        toast.error(
          `${failures} file${failures === 1 ? "" : "s"} failed${firstError ? ` — ${firstError}` : ""}.`,
        );
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = e.target.files;
          e.target.value = "";
          void upload(files);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="rounded-full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label="Bulk upload ministry update photos"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Files className="h-4 w-4" />}
        {busy && progress ? `Uploading ${progress.done}/${progress.total}…` : "Bulk upload photos"}
      </Button>
    </>
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
    const check = validateFile(f, { allowed: IMAGE_MIME, maxMb: MAX_MB });
    if (!check.ok) {
      toast.error(check.reason ?? "Invalid image.");
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
        const check = validateFile(file, { allowed: IMAGE_MIME, maxMb: MAX_MB });
        if (!check.ok) throw new Error(check.reason);
        const path = safeStoragePath(missionaryId, file);
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
