import { useMemo, useState, useRef, type FormEvent } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createDisplayUrl } from "@/lib/storage-signed";
import { PhotoLightbox } from "@/components/PhotoLightbox";

import { Loader2, Plus, FileUp, Trash2, Calendar, X, Mail, Download, FileText, ExternalLink, Files, Pencil, Save, Sparkles } from "lucide-react";
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
import { bulkFileDate } from "@/lib/parse-filename-date";
import { PdfPreviewDialog } from "@/components/PdfPreviewDialog";
import { BulkUploadProgress, type FileResult } from "@/components/BulkUploadProgress";
import { OrderVerificationLog } from "@/components/OrderVerificationLog";
import { monthKey } from "@/lib/month-key";
import { ocrLetter } from "@/lib/ocr-letter.functions";
import { OcrReviewPanel, type OcrConfidence, type OcrSuggestion } from "@/components/OcrReviewPanel";


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
const MAX_MB = 25;
const BULK_CONCURRENCY = 4;
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
        .order("letter_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Only images can be shown in the lightbox; PDFs still get the PDF preview.
  const imageLetters = useMemo(
    () => (letters ?? []).filter((l) => l.letter_url && !/\.pdf(\?|$)/i.test(l.letter_url)),
    [letters],
  );

  // Group letters by year so the timeline collapses into per-year sections,
  // matching the Ministry Updates layout.
  const lettersByYear = useMemo(() => {
    const map = new Map<string, Letter[]>();
    for (const l of letters ?? []) {
      const year = l.letter_date && /^\d{4}/.test(l.letter_date) ? l.letter_date.slice(0, 4) : "Undated";
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(l);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "Undated") return 1;
      if (b[0] === "Undated") return -1;
      return b[0].localeCompare(a[0]);
    });
  }, [letters]);
  const latestYear = lettersByYear[0]?.[0];



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

      {isAdmin && letters && letters.length > 0 ? (
        <OrderVerificationLog
          items={letters.map((l) => ({ id: l.id, title: l.title, date: l.letter_date, created_at: l.created_at }))}
          dateFieldLabel="letter_date"
          label="Verify month ordering"
        />
      ) : null}

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
          lettersByYear.map(([year, yearLetters]) => (
            <details key={year} open={year === latestYear} className="group rounded-2xl border border-border/60 bg-card/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-3 hover:bg-muted/40">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-semibold">{year}</span>
                  <span className="text-xs text-muted-foreground">{yearLetters.length} {yearLetters.length === 1 ? "letter" : "letters"}</span>
                </div>
                <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="space-y-4 p-3 pt-1">
                {yearLetters.map((l) => (
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
                        {l.letter_url ? (
                          <LetterAttachment
                            path={l.letter_url}
                            title={l.title}
                            onOpenImage={() => {
                              const idx = imageLetters.findIndex((x) => x.id === l.id);
                              setLightboxIndex(idx >= 0 ? idx : 0);
                            }}
                          />
                        ) : null}
                      </>
                    )}
                  </article>
                ))}
              </div>
            </details>
          ))
        )}

      </div>
      {lightboxIndex !== null && imageLetters.length > 0 ? (
        <LettersLightbox
          items={imageLetters.map((l) => ({ path: l.letter_url as string, title: l.title }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
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


function LetterAttachment({
  path,
  title,
  onOpenImage,
}: {
  path: string;
  title: string;
  onOpenImage?: () => void;
}) {
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
        onClick={() => {
          if (isPdf) setPreviewOpen(true);
          else if (onOpenImage) onOpenImage();
          else window.open(url, "_blank", "noopener,noreferrer");
        }}
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

/**
 * Signs every image thank-you letter in parallel and shows them in a gallery
 * lightbox with prev/next navigation.
 */
function LettersLightbox({
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
  return (
    <PhotoLightbox
      open
      onClose={onClose}
      items={lightboxItems}
      index={Math.min(index, lightboxItems.length - 1)}
    />
  );
}




function LetterForm({ missionaryId }: { missionaryId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [letterDate, setLetterDate] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [ocrSuggestions, setOcrSuggestions] = useState<OcrSuggestion[]>([]);
  const [ocrOverall, setOcrOverall] = useState<OcrConfidence>(null);
  const runOcr = useServerFn(ocrLetter);

  function readAsDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error ?? new Error("Failed to read file."));
      r.readAsDataURL(f);
    });
  }

  async function tryOcr(f: File) {
    if (!f.type.startsWith("image/")) return;
    setOcrStatus("running");
    setOcrNote(null);
    setOcrSuggestions([]);
    setOcrOverall(null);
    try {
      const dataUrl = await readAsDataUrl(f);
      const result = await runOcr({ data: { imageDataUrl: dataUrl } });
      setOcrOverall(result.confidence);
      const next: OcrSuggestion[] = [];
      if (result.date) {
        next.push({ key: "date", label: "Letter date", value: result.date, confidence: result.fieldConfidence.date });
      }
      // Prefer explicit title; fall back to a title suggestion from the recipient name.
      if (result.title) {
        next.push({ key: "title", label: "Title", value: result.title, confidence: result.fieldConfidence.title });
      } else if (result.recipient) {
        next.push({
          key: "title",
          label: "Title (from recipient)",
          value: `Thank you to ${result.recipient}`,
          confidence: result.fieldConfidence.recipient,
        });
      }
      if (result.recipient) {
        next.push({
          key: "recipient",
          label: "Recipient",
          value: result.recipient,
          confidence: result.fieldConfidence.recipient,
        });
      }
      if (result.message) {
        next.push({
          key: "message",
          label: "Message",
          value: result.message,
          confidence: result.fieldConfidence.message,
          multiline: true,
        });
      }
      if (result.amounts) {
        next.push({
          key: "amounts",
          label: "Amounts detected (reference only)",
          value: result.amounts,
          confidence: result.fieldConfidence.amounts,
        });
      }
      setOcrSuggestions(next);
      setOcrStatus("done");
      if (next.length === 0) {
        setOcrNote("Couldn't confidently read this letter — please fill in the fields manually.");
      } else {
        setOcrNote("Review each detected field, then choose Use, Edit, or Dismiss. Nothing is applied automatically.");
      }
    } catch (err) {
      console.error("Letter OCR failed", err);
      setOcrStatus("error");
      setOcrNote(err instanceof Error ? err.message : "OCR failed. Please fill in fields manually.");
    }
  }

  function applyOcrValue(key: string, value: string) {
    if (key === "date") setLetterDate(value);
    else if (key === "title") setTitle(value);
    else if (key === "recipient") {
      // Recipient isn't its own field — append it to the message for context.
      setMessage((prev) => (prev.trim() ? prev : `Dear ${value},\n\n`));
    } else if (key === "message") setMessage(value);
    // "amounts" is reference-only; accepting appends into the message body.
    else if (key === "amounts") {
      setMessage((prev) => (prev.trim() ? `${prev}\n\nAmounts: ${value}` : `Amounts: ${value}`));
    }
    setOcrSuggestions((prev) => prev.filter((s) => s.key !== key));
  }

  function pickFile(f: File | null) {
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      setOcrStatus("idle");
      setOcrNote(null);
      setOcrSuggestions([]);
      setOcrOverall(null);
      return;
    }
    const check = validateFile(f, { allowed: LETTER_MIME, maxMb: MAX_MB });
    if (!check.ok) {
      toast.error(check.reason ?? "Invalid file.");
      return;
    }
    setFile(f);
    setPreviewUrl(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    void tryOcr(f);
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

      const insertPayload: {
        missionary_id: string;
        title: string;
        message: string | null;
        letter_url: string | null;
        letter_date?: string;
      } = {
        missionary_id: missionaryId,
        title: title.trim(),
        message: message.trim() || null,
        letter_url: letter_path,
      };
      if (letterDate) insertPayload.letter_date = letterDate;

      const { error } = await supabase.from("thank_you_letters").insert(insertPayload);
      if (error) throw error;
      toast.success("Thank you letter posted.");
      setTitle("");
      setMessage("");
      setLetterDate("");
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
        <Label htmlFor="tyl-date">Letter date</Label>
        <Input
          id="tyl-date"
          type="date"
          value={letterDate}
          onChange={(e) => setLetterDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
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
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Auto-reads image letters
          </span>
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
        {ocrStatus === "running" ? (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Reading letter with AI…
          </div>
        ) : null}
        {ocrStatus === "error" && ocrNote ? (
          <div className="mt-1 rounded-lg border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
            <div className="flex items-start gap-1.5">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{ocrNote}</span>
            </div>
          </div>
        ) : (
          <OcrReviewPanel
            overallConfidence={ocrOverall}
            suggestions={ocrSuggestions}
            note={ocrNote}
            onAccept={(key, value) => applyOcrValue(key, value)}
            onDismiss={(key) => setOcrSuggestions((prev) => prev.filter((s) => s.key !== key))}
            onAcceptAll={() => {
              for (const s of ocrSuggestions) applyOcrValue(s.key, s.value);
            }}
            onDismissAll={() => setOcrSuggestions([])}
          />
        )}
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
  const [results, setResults] = useState<FileResult[]>([]);

  function updateAt(i: number, patch: Partial<FileResult>) {
    setResults((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;

    const initial: FileResult[] = [];
    const validIndex: number[] = [];
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      const check = validateFile(f, { allowed: LETTER_MIME, maxMb: MAX_MB });
      const computedDate = bulkFileDate(f);
      const base: FileResult = {
        name: f.name,
        size: f.size,
        status: check.ok ? "pending" : "skipped",
        message: check.ok ? undefined : check.reason,
        computedDate,
        computedMonth: monthKey(computedDate),
      };
      initial.push(base);
      if (check.ok) {
        validIndex.push(initial.length - 1);
        valid.push(f);
      }
    }
    setResults(initial);
    if (valid.length === 0) {
      toast.error("No valid letters to upload.");
      return;
    }

    setBusy(true);
    let successes = 0;
    let failures = 0;

    const doOne = async (f: File, vIdx: number) => {
      const rIdx = validIndex[vIdx];
      updateAt(rIdx, { status: "uploading" });
      try {
        const path = safeStoragePath(missionaryId, f, `bulk-${vIdx}`);
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, {
          cacheControl: "3600",
          upsert: false,
          contentType: f.type || undefined,
        });
        if (upErr) throw upErr;
        const title = f.name.replace(/\.[^.]+$/, "").slice(0, 200);
        const letter_date = bulkFileDate(f);
        const { error: dbErr } = await supabase.from("thank_you_letters").insert({
          missionary_id: missionaryId,
          title: title || "Thank you letter",
          letter_url: path,
          letter_date,
        });
        if (dbErr) throw dbErr;
        successes++;
        updateAt(rIdx, { status: "success" });
      } catch (err) {
        failures++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("bulk letter upload failed for", f.name, err);
        updateAt(rIdx, { status: "error", message: msg });
      }
    };

    try {
      let cursor = 0;
      const workers = Array.from({ length: Math.min(BULK_CONCURRENCY, valid.length) }, async () => {
        while (cursor < valid.length) {
          const i = cursor++;
          await doOne(valid[i], i);
        }
      });
      await Promise.all(workers);

      if (successes > 0) {
        toast.success(`Uploaded ${successes} letter${successes === 1 ? "" : "s"}.`);
        qc.invalidateQueries({ queryKey: ["thank_you_letters", missionaryId] });
        qc.invalidateQueries({ queryKey: ["thank_you_letters_admin", missionaryId] });
      }
      if (failures > 0) {
        toast.error(`${failures} file${failures === 1 ? "" : "s"} failed. See details below.`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
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
        {busy
          ? `Uploading ${results.filter((r) => r.status === "success" || r.status === "error").length}/${results.filter((r) => r.status !== "skipped").length}…`
          : "Bulk upload files"}
      </Button>
      <BulkUploadProgress
        results={results}
        onClose={() => setResults([])}
        title="Thank-you letter upload"
      />
    </div>
  );
}
