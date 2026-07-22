import { useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ImagePlus, Trash2, Receipt, X, Pencil, Save, Files } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { createDisplayUrl } from "@/lib/storage-signed";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { IMAGE_MIME, safeStoragePath, validateFile } from "@/lib/upload-validation";
import { bulkFileDate } from "@/lib/parse-filename-date";
import { OcrReviewPanel, type OcrConfidence, type OcrSuggestion } from "@/components/OcrReviewPanel";

interface Props {
  missionaryId: string;
  missionaryName: string;
}

interface ReceiptRow {
  id: string;
  missionary_id: string;
  title: string;
  amount: number | null;
  currency: string;
  note: string | null;
  image_url: string | null;
  receipt_date: string;
  created_at: string;
  created_by: string | null;
}

const BUCKET = "support-receipts";
const MAX_MB = 25;
const BULK_CONCURRENCY = 4;

function formatAmount(amount: number | null | undefined, currency: string) {
  if (amount == null) return null;
  const cur = currency || "PHP";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${cur} ${Number(amount).toLocaleString()}`;
  }
}

export function SupportReceipts({ missionaryId, missionaryName }: Props) {
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: receipts, isLoading } = useQuery({
    queryKey: ["support_receipts", missionaryId],
    queryFn: async (): Promise<ReceiptRow[]> => {
      const { data, error } = await supabase
        .from("support_receipts")
        .select("*")
        .eq("missionary_id", missionaryId)
        .order("receipt_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReceiptRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("support_receipts")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Nothing was deleted. You may not have permission, or the item was already removed.");
      }
    },
    onSuccess: () => {
      toast.success("Receipt deleted.");
      qc.invalidateQueries({ queryKey: ["support_receipts"] });
      qc.invalidateQueries({ queryKey: ["support_receipts", missionaryId] });
    },
    onError: (e: Error) =>
      toast.error(
        /row-level|permission/i.test(e.message)
          ? "You don't have permission to delete this receipt."
          : e.message,
      ),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const withImages = useMemo(
    () => (receipts ?? []).filter((r) => !!r.image_url),
    [receipts],
  );

  // Group by year so the timeline collapses into per-year sections, matching Ministry Updates.
  const receiptsByYear = useMemo(() => {
    const map = new Map<string, ReceiptRow[]>();
    for (const r of receipts ?? []) {
      const year = r.receipt_date && /^\d{4}/.test(r.receipt_date) ? r.receipt_date.slice(0, 4) : "Undated";
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "Undated") return 1;
      if (b[0] === "Undated") return -1;
      return b[0].localeCompare(a[0]);
    });
  }, [receipts]);
  const latestYear = receiptsByYear[0]?.[0];

  const yearTotals = useMemo(() => {
    const totals = new Map<string, { total: number; currency: string; mixed: boolean }>();
    for (const [year, list] of receiptsByYear) {
      let total = 0;
      let currency = "";
      let mixed = false;
      for (const r of list) {
        if (r.amount == null) continue;
        if (!currency) currency = r.currency || "PHP";
        else if (currency !== (r.currency || "PHP")) mixed = true;
        total += Number(r.amount);
      }
      totals.set(year, { total, currency: currency || "PHP", mixed });
    }
    return totals;
  }, [receiptsByYear]);

  return (
    <Card className="card-soft p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-xl font-semibold">Support Receipts</h3>
          <p className="text-xs text-muted-foreground">
            Monthly proof of financial support sent to {missionaryName}. Kept here for full transparency.
          </p>
        </div>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap gap-2">
          <ReceiptForm missionaryId={missionaryId} />
          <BulkReceiptUpload missionaryId={missionaryId} />
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading receipts…
          </div>
        ) : !receipts || receipts.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No receipts posted yet"
            description={
              canEdit
                ? "Use the form above to upload the first monthly receipt."
                : "Support receipts will appear here once they are posted."
            }
          />
        ) : (
          receiptsByYear.map(([year, list]) => {
            const totals = yearTotals.get(year);
            return (
              <details key={year} open={year === latestYear} className="group rounded-2xl border border-border/60 bg-card/40">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-3 hover:bg-muted/40">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-lg font-semibold">{year}</span>
                    <span className="text-xs text-muted-foreground">
                      {list.length} {list.length === 1 ? "receipt" : "receipts"}
                    </span>
                    {totals && totals.total > 0 && !totals.mixed ? (
                      <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                        Total {formatAmount(totals.total, totals.currency)}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">▾</span>
                </summary>
                <div className="space-y-4 p-3 pt-1">
                  {list.map((r) => (
                    <article key={r.id} className="rounded-2xl border border-border/60 bg-card p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {new Date(r.receipt_date).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                          <h4 className="font-display text-base font-semibold">{r.title}</h4>
                          {r.amount != null ? (
                            <div className="mt-1 font-display text-lg font-semibold text-primary">
                              {formatAmount(r.amount, r.currency)}
                            </div>
                          ) : null}
                        </div>
                        {canEdit ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                              aria-label="Edit receipt"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (confirm("Delete this receipt?")) del.mutate(r.id);
                                }}
                                aria-label="Delete receipt"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {editingId === r.id ? (
                        <ReceiptEditForm
                          receipt={r}
                          onClose={() => setEditingId(null)}
                          onSaved={() => setEditingId(null)}
                        />
                      ) : (
                        <>
                          {r.image_url ? (
                            <ReceiptImageThumb
                              path={r.image_url}
                              title={r.title}
                              onOpen={() => {
                                const idx = withImages.findIndex((x) => x.id === r.id);
                                setLightboxIndex(idx >= 0 ? idx : 0);
                              }}
                            />
                          ) : null}
                          {r.note ? (
                            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                              {r.note}
                            </p>
                          ) : null}
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </details>
            );
          })
        )}
      </div>

      {lightboxIndex !== null && withImages.length > 0 ? (
        <ReceiptsLightbox
          items={withImages.map((r) => ({ path: r.image_url as string, title: r.title }))}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </Card>
  );
}

function ReceiptImageThumb({ path, title, onOpen }: { path: string; title: string; onOpen: () => void }) {
  const { data: url, isLoading } = useSignedUrl(BUCKET, path);
  if (isLoading) {
    return (
      <div className="mt-3 flex h-40 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading receipt…
      </div>
    );
  }
  if (!url) return null;
  return (
    <button
      type="button"
      className="mt-3 block w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      onClick={onOpen}
      aria-label={`View full receipt for ${title}`}
    >
      <img
        src={url}
        alt={title}
        className="max-h-96 w-full object-contain bg-muted/40 transition-transform hover:scale-[1.01]"
        loading="lazy"
      />
    </button>
  );
}

function ReceiptsLightbox({
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
  return <PhotoLightbox open onClose={onClose} items={lightboxItems} index={clamped} />;
}

function ReceiptForm({ missionaryId }: { missionaryId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("PHP");
  const [note, setNote] = useState("");
  const [receiptDate, setReceiptDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [ocrSuggestions, setOcrSuggestions] = useState<OcrSuggestion[]>([]);
  const [ocrOverall, setOcrOverall] = useState<OcrConfidence>(null);

  async function fileToDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error ?? new Error("Failed to read image"));
      r.readAsDataURL(f);
    });
  }

  async function runOcr(f: File) {
    setOcrBusy(true);
    setOcrNote(null);
    setOcrSuggestions([]);
    setOcrOverall(null);
    try {
      const imageDataUrl = await fileToDataUrl(f);
      const { ocrReceipt } = await import("@/lib/ocr-receipt.functions");
      const result = await ocrReceipt({ data: { imageDataUrl } });
      setOcrOverall(result.confidence);
      const next: OcrSuggestion[] = [];
      if (result.date) {
        next.push({ key: "date", label: "Receipt date", value: result.date, confidence: result.fieldConfidence.date });
      }
      if (result.amount != null) {
        next.push({
          key: "amount",
          label: "Amount",
          value: String(result.amount),
          confidence: result.fieldConfidence.amount,
        });
      }
      if (result.currency) {
        next.push({
          key: "currency",
          label: "Currency",
          value: result.currency,
          confidence: result.fieldConfidence.currency,
        });
      }
      if (result.title) {
        next.push({ key: "title", label: "Title", value: result.title, confidence: result.fieldConfidence.title });
      }
      setOcrSuggestions(next);
      if (next.length === 0) {
        setOcrNote("Couldn't read the receipt clearly — please fill the fields manually.");
      } else {
        setOcrNote("Review each detected field, then choose Use, Edit, or Dismiss. Nothing is applied automatically.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "OCR failed.";
      setOcrNote(`OCR failed: ${msg}`);
    } finally {
      setOcrBusy(false);
    }
  }

  function applyOcrValue(key: string, value: string) {
    if (key === "date") setReceiptDate(value);
    else if (key === "amount") setAmount(value);
    else if (key === "currency") setCurrency(value.toUpperCase());
    else if (key === "title") setTitle(value);
    setOcrSuggestions((prev) => prev.filter((s) => s.key !== key));
  }

  function pickFile(f: File | null) {
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      setOcrNote(null);
      setOcrSuggestions([]);
      setOcrOverall(null);
      return;
    }
    const check = validateFile(f, { allowed: IMAGE_MIME, maxMb: MAX_MB });
    if (!check.ok) {
      toast.error(check.reason ?? "Invalid image.");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    void runOcr(f);
  }



  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required.");
    if (!receiptDate) return toast.error("Receipt date is required.");
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

      const parsedAmount = amount.trim() ? Number(amount.replace(/,/g, "")) : null;
      if (parsedAmount != null && !Number.isFinite(parsedAmount)) {
        throw new Error("Amount must be a number.");
      }

      const { error } = await supabase.from("support_receipts").insert({
        missionary_id: missionaryId,
        title: title.trim(),
        amount: parsedAmount,
        currency: currency.trim().toUpperCase() || "PHP",
        note: note.trim() || null,
        image_url: image_path,
        receipt_date: receiptDate,
      });
      if (error) throw error;
      toast.success("Receipt posted.");
      setTitle("");
      setAmount("");
      setNote("");
      pickFile(null);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["support_receipts", missionaryId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post receipt.";
      toast.error(
        /row-level|permission/i.test(msg)
          ? "You don't have permission to post receipts for this missionary."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="rounded-full" size="sm">
        <Plus className="h-4 w-4" /> Post support receipt
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="w-full space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
      aria-label="Post support receipt"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="sr-title">Title *</Label>
        <Input
          id="sr-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. July 2026 monthly support"
          required
        />
      </div>
      <div className="grid gap-1.5 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="sr-date">Receipt date *</Label>
          <Input id="sr-date" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sr-amount">Amount</Label>
          <Input
            id="sr-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 5000"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sr-currency">Currency</Label>
          <Input
            id="sr-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={5}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sr-note">Note (optional)</Label>
        <Textarea
          id="sr-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Purpose, reference number, sender, etc."
          className="min-h-[80px]"
          maxLength={2000}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sr-photo" className="flex items-center gap-1.5">
          <ImagePlus className="h-4 w-4" /> Receipt photo (optional, max {MAX_MB} MB)
          <span className="ml-1 text-[10px] font-normal text-muted-foreground">— AI reads it, you choose what to apply</span>
        </Label>
        <Input
          id="sr-photo"
          type="file"
          accept="image/*"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {ocrBusy ? (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading receipt with AI…
          </div>
        ) : null}
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
        {previewUrl ? (
          <div className="relative mt-1 w-fit">
            <img src={previewUrl} alt="" className="max-h-48 rounded-xl object-contain bg-muted/40" />
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
          {busy ? "Posting…" : "Post receipt"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-full">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ReceiptEditForm({
  receipt,
  onClose,
  onSaved,
}: {
  receipt: ReceiptRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(receipt.title);
  const [amount, setAmount] = useState(receipt.amount != null ? String(receipt.amount) : "");
  const [currency, setCurrency] = useState(receipt.currency || "PHP");
  const [note, setNote] = useState(receipt.note ?? "");
  const [receiptDate, setReceiptDate] = useState(receipt.receipt_date?.slice(0, 10) ?? "");

  const key = ["support_receipts", receipt.missionary_id] as const;
  const save = useMutation({
    mutationFn: async () => {
      const parsedAmount = amount.trim() ? Number(amount.replace(/,/g, "")) : null;
      if (parsedAmount != null && !Number.isFinite(parsedAmount)) throw new Error("Amount must be a number.");
      const { error } = await supabase
        .from("support_receipts")
        .update({
          title: title.trim(),
          amount: parsedAmount,
          currency: currency.trim().toUpperCase() || "PHP",
          note: note.trim() || null,
          receipt_date: receiptDate,
        })
        .eq("id", receipt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Receipt saved.");
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["support_receipts"] });
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={200} />
      <div className="grid gap-2 sm:grid-cols-3">
        <Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
        <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
        <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} placeholder="Currency" maxLength={5} />
      </div>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="min-h-[80px]" maxLength={2000} />
      <div className="flex gap-2">
        <Button size="sm" className="rounded-full" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
        <Button size="sm" variant="ghost" className="rounded-full" onClick={onClose}>
          <X className="h-4 w-4" /> Cancel
        </Button>
      </div>
    </div>
  );
}

function BulkReceiptUpload({ missionaryId }: { missionaryId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      const check = validateFile(f, { allowed: IMAGE_MIME, maxMb: MAX_MB });
      if (check.ok) valid.push(f);
    }
    if (valid.length === 0) {
      toast.error("No valid receipt images to upload.");
      return;
    }

    setBusy(true);
    setProgress({ done: 0, total: valid.length });
    let successes = 0;
    let failures = 0;

    const doOne = async (f: File, idx: number) => {
      try {
        const path = safeStoragePath(missionaryId, f, `bulk-${idx}`);
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, f, {
          cacheControl: "3600",
          upsert: false,
          contentType: f.type || undefined,
        });
        if (upErr) throw upErr;
        const title = f.name.replace(/\.[^.]+$/, "").slice(0, 200) || "Support receipt";
        const receipt_date = bulkFileDate(f);
        const { error: dbErr } = await supabase.from("support_receipts").insert({
          missionary_id: missionaryId,
          title,
          image_url: path,
          receipt_date,
        });
        if (dbErr) throw dbErr;
        successes++;
      } catch (err) {
        failures++;
        console.error("bulk receipt upload failed for", f.name, err);
      } finally {
        setProgress((p) => ({ done: p.done + 1, total: p.total }));
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
        toast.success(`Uploaded ${successes} receipt${successes === 1 ? "" : "s"}.`);
        qc.invalidateQueries({ queryKey: ["support_receipts"] });
        qc.invalidateQueries({ queryKey: ["support_receipts", missionaryId] });
      }
      if (failures > 0) {
        toast.error(`${failures} file${failures === 1 ? "" : "s"} failed to upload.`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
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
        aria-label="Bulk upload support receipts"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Files className="h-4 w-4" />}
        {busy ? `Uploading ${progress.done}/${progress.total}…` : "Bulk upload receipts"}
      </Button>
    </div>
  );
}
