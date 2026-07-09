import { useState, useRef, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, FileUp, Trash2, Calendar, X, Mail, Download, FileText, ExternalLink, Files, Pencil, Save } from "lucide-react";
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
import { LETTER_MIME, safeStoragePath, validateFile } from "@/lib/upload-validation";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";


interface Props {
  missionaryId: string;
  missionaryName: string;
}

interface Letter {
  id: string;
  missionary_id: string;
  title: string;
  message: string | null;
  letter_url: string | null;
  letter_date: string;
  created_at: string;
  created_by: string | null;
}

const BUCKET = "thank-you-letters";
const MAX_MB = 8;
const ACCEPTED = "image/*,application/pdf";

export function ThankYouLetters({ missionaryId, missionaryName }: Props) {
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: letters, isLoading } = useQuery({
    queryKey: ["thank_you_letters", missionaryId],
    queryFn: async (): Promise<Letter[]> => {
      const { data, error } = await supabase
        .from("thank_you_letters")
        .select("*")
        .eq("missionary_id", missionaryId)
        .order("letter_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("thank_you_letters")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Nothing was deleted. You may not have permission, or the item was already removed.");
      }
    },
    onSuccess: () => {
      toast.success("Letter deleted.");
      qc.invalidateQueries({ queryKey: ["thank_you_letters"] });
      qc.invalidateQueries({ queryKey: ["thank_you_letters", missionaryId] });
      qc.invalidateQueries({ queryKey: ["thank_you_letters_admin", missionaryId] });
    },
    onError: (e: Error) =>
      toast.error(
        /row-level|permission/i.test(e.message)
          ? "You don't have permission to delete this letter."
          : e.message,
      ),
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className="card-soft p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-display text-xl font-semibold">Thank You Letters</h3>
            <p className="text-xs text-muted-foreground">
              Letters of gratitude from {missionaryName} to partners and supporters.
            </p>
          </div>
        </div>
      </div>

      {canEdit ? <LetterForm missionaryId={missionaryId} /> : null}

      <div className="mt-5 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading letters…
          </div>
        ) : !letters || letters.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No thank you letters yet"
            description={
              canEdit
                ? "Use the form above to upload the first thank you letter."
                : "Thank you letters will appear here once posted."
            }
          />
        ) : (
          letters.map((l) => (
            <article key={l.id} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {new Date(l.letter_date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <h4 className="font-display text-base font-semibold">{l.title}</h4>
                </div>
                {canEdit ? (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(editingId === l.id ? null : l.id)}
                      aria-label="Edit letter"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Delete this letter?")) del.mutate(l.id);
                        }}
                        aria-label="Delete letter"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {editingId === l.id ? (
                <LetterEditForm
                  letter={l}
                  onClose={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null);
                    qc.invalidateQueries({ queryKey: ["thank_you_letters", missionaryId] });
                    qc.invalidateQueries({ queryKey: ["thank_you_letters_admin", missionaryId] });
                  }}
                />
              ) : (
                <>
                  {l.message ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                      {l.message}
                    </p>
                  ) : null}
                  {l.letter_url ? <LetterAttachment path={l.letter_url} title={l.title} /> : null}
                </>
              )}
            </article>
          ))
        )}
      </div>
    </Card>
  );
}

function LetterEditForm({
  letter,
  onClose,
  onSaved,
}: {
  letter: Letter;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(letter.title);
  const [message, setMessage] = useState(letter.message ?? "");

  const keys = [
    ["thank_you_letters", letter.missionary_id],
    ["thank_you_letters_admin", letter.missionary_id],
  ] as const;

  const save = useMutation({
    mutationFn: async (patch: { title: string; message: string | null }) => {
      const { error } = await supabase
        .from("thank_you_letters")
        .update(patch)
        .eq("id", letter.id);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      const snapshots = await Promise.all(
        keys.map(async (key) => {
          await qc.cancelQueries({ queryKey: key });
          return [key, qc.getQueryData(key)] as const;
        }),
      );
      for (const [key] of snapshots) {
        qc.setQueryData<Letter[] | undefined>(key, (prev) =>
          prev?.map((l) => (l.id === letter.id ? { ...l, ...patch } : l)),
        );
      }
      return { snapshots };
    },
    onError: (err, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(err instanceof Error ? `Update failed: ${err.message}. Reverted.` : "Update failed. Reverted.");
    },
    onSuccess: () => {
      toast.success("Letter updated.");
      onSaved();
    },
    onSettled: () => keys.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });

  function submit() {
    if (!title.trim()) return toast.error("Title is required.");
    save.mutate({ title: title.trim(), message: message.trim() || null });
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" className="min-h-[80px]" />
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


function LetterAttachment({ path, title }: { path: string; title: string }) {
  const { data: url, isLoading } = useSignedUrl(BUCKET, path);
  const isPdf = /\.pdf(\?|$)/i.test(path);
  const [previewOpen, setPreviewOpen] = useState(false);
  if (isLoading) {
    return (
      <div className="mt-3 flex h-32 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading letter…
      </div>
    );
  }
  if (!url) return null;
  return (
    <div className="mt-3 flex flex-wrap items-start gap-3">
      <button
        type="button"
        onClick={() => (isPdf ? setPreviewOpen(true) : window.open(url, "_blank", "noopener,noreferrer"))}
        className="group block overflow-hidden rounded-xl border border-border bg-muted text-left"
        aria-label={`Preview thank you letter: ${title}`}
      >
        {isPdf ? (
          <div className="flex h-32 w-40 flex-col items-center justify-center gap-1 text-muted-foreground group-hover:bg-muted/70">
            <FileText className="h-8 w-8" />
            <span className="text-[11px] font-medium uppercase tracking-wide">PDF letter</span>
          </div>
        ) : (
          <img
            src={url}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-32 w-40 object-cover transition-transform group-hover:scale-105"
          />
        )}
      </button>
      <div className="flex flex-col gap-2">
        {isPdf ? (
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            onClick={() => setPreviewOpen(true)}
          >
            <FileText className="h-4 w-4" /> Preview letter
          </Button>
        ) : null}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          {isPdf ? <Download className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          {isPdf ? "Open in new tab" : "View full letter"}
        </a>
        <span className="text-[11px] text-muted-foreground">Signed link expires after a while.</span>
      </div>
      {isPdf ? (
        <PdfPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} url={url} title={title} />
      ) : null}
    </div>
  );
}


function LetterForm({ missionaryId }: { missionaryId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
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
    const check = validateFile(f, { allowed: LETTER_MIME, maxMb: MAX_MB });
    if (!check.ok) {
      toast.error(check.reason ?? "Invalid file.");
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required.");
    setBusy(true);
    try {
      let letter_path: string | null = null;
      if (file) {
        const check = validateFile(file, { allowed: LETTER_MIME, maxMb: MAX_MB });
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
        letter_path = path;
      }

      const { error } = await supabase.from("thank_you_letters").insert({
        missionary_id: missionaryId,
        title: title.trim(),
        message: message.trim() || null,
        letter_url: letter_path,
      });
      if (error) throw error;
      toast.success("Thank you letter posted.");
      setTitle("");
      setMessage("");
      pickFile(null);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["thank_you_letters", missionaryId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post letter.";
      toast.error(
        /row-level|permission/i.test(msg)
          ? "You don't have permission to post letters for this missionary."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setOpen(true)} className="rounded-full" size="sm">
          <Plus className="h-4 w-4" /> Upload thank you letter
        </Button>
        <BulkLetterUpload missionaryId={missionaryId} />
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
      aria-label="Upload thank you letter"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="tyl-title">Title *</Label>
        <Input
          id="tyl-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Thank you for your prayers this quarter"
          required
          maxLength={200}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tyl-message">Message</Label>
        <Textarea
          id="tyl-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write the thank you note here (optional if attaching a file)"
          className="min-h-[120px]"
          maxLength={5000}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tyl-file" className="flex items-center gap-1.5">
          <FileUp className="h-4 w-4" /> Attach letter (JPG, PNG, WebP, GIF, or PDF · max {MAX_MB} MB)
        </Label>
        <Input
          id="tyl-file"
          type="file"
          accept={ACCEPTED}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {file && !previewUrl ? (
          <div className="mt-1 text-xs text-muted-foreground">Selected: {file.name}</div>
        ) : null}
        {previewUrl ? (
          <div className="relative mt-1 w-fit">
            <img src={previewUrl} alt="" className="max-h-48 rounded-xl object-cover" />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-7 w-7 rounded-full bg-background/80"
              onClick={() => pickFile(null)}
              aria-label="Remove file"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy} className="rounded-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {busy ? "Uploading…" : "Post letter"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-full">
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Bulk upload — accepts multiple images/PDFs and creates one thank-you-letter
 * row per file. Validates each file up front and uses safe collision-resistant
 * storage paths so uploads never overwrite each other.
 */
function BulkLetterUpload({ missionaryId }: { missionaryId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      const check = validateFile(f, { allowed: LETTER_MIME, maxMb: MAX_MB });
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
    try {
      for (let i = 0; i < valid.length; i++) {
        const f = valid[i];
        try {
          const path = safeStoragePath(missionaryId, f, String(i));
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, {
            cacheControl: "3600",
            upsert: false,
            contentType: f.type || undefined,
          });
          if (upErr) throw upErr;
          const title = f.name.replace(/\.[^.]+$/, "").slice(0, 200);
          const { error: dbErr } = await supabase.from("thank_you_letters").insert({
            missionary_id: missionaryId,
            title: title || "Thank you letter",
            letter_url: path,
          });
          if (dbErr) throw dbErr;
          successes++;
        } catch (err) {
          failures++;
          console.error("bulk upload failed for", f.name, err);
        } finally {
          setProgress({ done: i + 1, total: valid.length });
        }
      }
      if (successes > 0) {
        toast.success(`Uploaded ${successes} letter${successes === 1 ? "" : "s"}.`);
        qc.invalidateQueries({ queryKey: ["thank_you_letters", missionaryId] });
        qc.invalidateQueries({ queryKey: ["thank_you_letters_admin", missionaryId] });
      }
      if (failures > 0) toast.error(`${failures} file${failures === 1 ? "" : "s"} failed to upload.`);
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
        accept={ACCEPTED}
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
        aria-label="Bulk upload thank-you letters"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Files className="h-4 w-4" />}
        {busy && progress
          ? `Uploading ${progress.done}/${progress.total}…`
          : "Bulk upload files"}
      </Button>
    </>
  );
}
