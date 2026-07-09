import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createDisplayUrl } from "@/lib/storage-signed";
import { z } from "zod";
import {
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Search as SearchIcon,
  Save,
  X,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PermissionError } from "@/components/PermissionError";
import { ConflictMergeDialog, computeMerge, type MergePreview } from "@/components/ConflictMergeDialog";
import {
  deleteArea,
  deleteMissionary,
  deletePhase,
  findSimilarMissionaries,
  normalizeName,
  syncAreaToCloud,
  syncPhaseToCloud,
  upsertArea,
  upsertMissionary,
  upsertPhase,
  type Area,
  type Missionary,
  type Phase,
} from "@/lib/mission-data";
import { useDataStore } from "@/hooks/use-data-store";

export const Route = createFileRoute("/manage")({
  head: () => ({
    meta: [
      { title: "Manage Missionaries — Cross-Cultural Mission" },
      { name: "description", content: "Add, edit, and manage Cross-Cultural Mission church planter pastors and their assignments." },
      { property: "og:title", content: "Manage Missionaries — Cross-Cultural Mission" },
      { property: "og:description", content: "Add, edit, and manage Cross-Cultural Mission church planter pastors and their assignments." },
      { property: "og:url", content: "https://cross-cultural-mission-ccm.lovable.app/manage" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
      { name: "twitter:title", content: "Manage Missionaries — Cross-Cultural Mission" },
      { name: "twitter:description", content: "Add, edit, and manage Cross-Cultural Mission church planter pastors and their assignments." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cross-cultural-mission-ccm.lovable.app/manage" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    edit: typeof s.edit === "string" ? s.edit : undefined,
    tab: (s.tab as string) === "phases" || s.tab === "areas" ? (s.tab as string) : "missionaries",
  }),
  component: ManagePage,
});

const missionarySchema = z.object({
  id: z.string().min(1),
  areaId: z.string().min(1, "Choose an area"),
  fullName: z.string().min(2, "Full name is required"),
  church: z.string().min(1, "Church is required"),
  address: z.string().min(1, "Address is required"),
  missionStatement: z.string().min(1, "Mission statement is required"),
  photo: z.string().optional(),
  ministryFocus: z.string().optional(),
  status: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  province: z.string().optional(),
  municipality: z.string().optional(),
  barangay: z.string().optional(),
});

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function ManagePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const store = useDataStore();
  const tab = search.tab ?? "missionaries";
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user) {
    return (
      <Card className="card-soft mx-auto max-w-md p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Admin sign-in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only admins can add or edit missionaries. Please sign in.
        </p>
        <Button asChild className="mt-4 rounded-full">
          <Link to="/auth">Sign in</Link>
        </Button>
      </Card>
    );
  }
  if (!isAdmin) {
    return (
      <PermissionError
        title="Admins only"
        message="Editing the missionary directory is restricted to administrators."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Manage Directory</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Add or edit phases, areas, and missionaries. Changes sync live to every device.
        </p>
      </header>

      <div role="tablist" aria-label="Manage sections" className="flex gap-1 rounded-full border border-border bg-muted/40 p-1 text-sm">
        {(["missionaries", "areas", "phases"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => navigate({ to: "/manage", search: { tab: t, edit: undefined } })}
            className={`flex-1 rounded-full px-4 py-2 capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              tab === t ? "bg-background shadow-soft font-semibold text-foreground" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "missionaries" ? (
        <MissionarySection store={store} editingId={search.edit} />
      ) : tab === "areas" ? (
        <AreaSection store={store} />
      ) : (
        <PhaseSection store={store} />
      )}
    </div>
  );
}

// ---------- Missionaries ---------------------------------------------------

function MissionarySection({
  store,
  editingId,
}: {
  store: ReturnType<typeof useDataStore>;
  editingId?: string;
}) {
  const [q, setQ] = useState("");
  const { isAdmin } = useAuth();
  const [pendingDelete, setPendingDelete] = useState<Missionary | null>(null);
  const editing = editingId ? store.missionaries.find((m) => m.id === editingId) : undefined;
  const [showForm, setShowForm] = useState(Boolean(editing));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return store.missionaries;
    return store.missionaries.filter((m) =>
      `${m.fullName} ${m.church} ${m.address}`.toLowerCase().includes(needle),
    );
  }, [q, store.missionaries]);

  if (showForm || editing) {
    return (
      <MissionaryForm
        initial={editing}
        areas={store.areas}
        existing={store.missionaries}
        onDone={() => setShowForm(false)}
      />

    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search missionaries…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
            aria-label="Search missionaries"
          />
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-full">
          <UserPlus className="h-4 w-4" /> Add missionary
        </Button>
      </div>

      {store.areas.length === 0 ? (
        <Card className="card-soft p-6 text-sm text-muted-foreground">
          You need at least one area before adding missionaries.{" "}
          <Link to="/manage" search={{ tab: "areas", edit: undefined }} className="text-primary underline">
            Create an area →
          </Link>
        </Card>
      ) : null}

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {filtered.map((m) => (
          <li key={m.id} className="flex items-center gap-3 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {m.photo ? (
                <img src={m.photo} alt="" className="h-full w-full object-cover" />
              ) : (
                m.fullName.split(" ").slice(0, 2).map((s) => s[0]).join("")
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{m.fullName}</div>
              <div className="truncate text-xs text-muted-foreground">
                {m.church} · {m.address}
              </div>
            </div>
            {isAdmin ? (
              <>
                <Button variant="ghost" size="icon" aria-label={`Edit ${m.fullName}`} asChild>
                  <Link to="/manage" search={{ tab: "missionaries", edit: m.id }}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${m.fullName}`}
                  onClick={() => setPendingDelete(m)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="p-8 text-center text-sm text-muted-foreground">No missionaries found.</li>
        ) : null}
      </ul>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this missionary?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.fullName} will be removed from the directory, the mission map, and every guest, supporter, and coordinator view. This cannot be undone from here.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!pendingDelete) return;
                const name = pendingDelete.fullName;
                deleteMissionary(pendingDelete.id);
                setPendingDelete(null);
                toast.success(`${name} deleted`);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


function MissionaryForm({
  initial,
  areas,
  existing,
  onDone,
}: {
  initial?: Missionary;
  areas: Area[];
  existing: Missionary[];
  onDone: () => void;
}) {
  const navigate = useNavigate();
  const [form, setForm] = useState<Partial<Missionary>>(
    initial ?? {
      id: "",
      areaId: areas[0]?.id ?? "",
      fullName: "",
      church: "",
      address: "",
      missionStatement: "",
      status: "Active",
    },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Snapshot loaded from the cloud row for optimistic-concurrency conflict detection.
  const loadedUpdatedAt = useRef<string | null>(null);
  const baseSnapshot = useRef<Missionary | null>(initial ?? null);
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [mergePreview, setMergePreview] = useState<MergePreview<Missionary> | null>(null);

  // Load current cloud updated_at when editing an existing missionary.
  useEffect(() => {
    if (!initial?.id) return;
    let cancelled = false;
    supabase
      .from("missionary_extras")
      .select("updated_at, data")
      .eq("id", initial.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        loadedUpdatedAt.current = data.updated_at;
        if (data.data && typeof data.data === "object") {
          baseSnapshot.current = { ...(data.data as unknown as Missionary), id: initial.id };
        }
      });
    // Listen for remote updates to THIS row while editing.
    function onChange(e: Event) {
      const detail = (e as CustomEvent<{ table: string; new: { id?: string } | null }>).detail;
      if (!detail || detail.table !== "missionary_extras") return;
      if (detail.new?.id !== initial?.id) return;
      setRemoteChanged(true);
    }
    window.addEventListener("gc-realtime-change", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("gc-realtime-change", onChange);
    };
  }, [initial?.id]);

  const set = <K extends keyof Missionary>(k: K, v: Missionary[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Live duplicate-name warning (case/title-insensitive) — exact + fuzzy
  const dupe = useMemo(() => {
    const name = (form.fullName ?? "").trim();
    if (!name) return null;
    const norm = normalizeName(name);
    return existing.find((m) => m.id !== (initial?.id ?? form.id) && normalizeName(m.fullName) === norm) ?? null;
  }, [form.fullName, form.id, initial?.id, existing]);

  const fuzzyMatches = useMemo(() => {
    const name = (form.fullName ?? "").trim();
    if (name.length < 3) return [];
    return findSimilarMissionaries(name, {
      excludeId: initial?.id ?? form.id,
      threshold: 0.82,
    }).filter((m) => m.missionary.id !== dupe?.id).slice(0, 3);
  }, [form.fullName, form.id, initial?.id, dupe?.id]);

  // Area ↔ Province mismatch warning
  const selectedArea = areas.find((a) => a.id === form.areaId);
  const provinceMismatch = useMemo(() => {
    if (!selectedArea?.province || !form.province) return null;
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
    if (norm(selectedArea.province) === norm(form.province)) return null;
    return { areaProvince: selectedArea.province, entered: form.province };
  }, [selectedArea?.province, form.province]);

  async function save() {
    const draft: Missionary = {
      ...(form as Missionary),
      id: form.id?.trim() || `m-${slug(form.fullName ?? "")}-${Date.now().toString(36)}`,
    };
    const parsed = missionarySchema.safeParse(draft);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0])] = issue.message;
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (dupe && !initial) {
      const ok = confirm(
        `A missionary named "${dupe.fullName}" already exists in ${areas.find((a) => a.id === dupe.areaId)?.name ?? "another area"}. Save anyway?`,
      );
      if (!ok) return;
    } else if (fuzzyMatches.length && !initial) {
      const top = fuzzyMatches[0];
      const ok = confirm(
        `"${top.missionary.fullName}" looks very similar (${Math.round(top.score * 100)}% match). Save this as a new missionary anyway?`,
      );
      if (!ok) return;
    }
    if (provinceMismatch) {
      const ok = confirm(
        `Area "${selectedArea?.name}" is in ${provinceMismatch.areaProvince}, but you entered "${provinceMismatch.entered}". Save anyway?`,
      );
      if (!ok) return;
    }
    // Auto-fill province from the area when empty — prevents Kidapawan-style mismatches.
    if (!draft.province && selectedArea?.province) draft.province = selectedArea.province;
    if (!draft.region && selectedArea?.region) draft.region = selectedArea.region;

    // Field-level 3-way merge if the remote row changed while we were editing.
    if (initial?.id && loadedUpdatedAt.current) {
      const { data: current } = await supabase
        .from("missionary_extras")
        .select("updated_at, data")
        .eq("id", initial.id)
        .maybeSingle();
      if (current && current.updated_at !== loadedUpdatedAt.current) {
        const theirs = { ...(current.data as unknown as Missionary), id: initial.id };
        const base = baseSnapshot.current ?? initial;
        const preview = computeMerge<Missionary>(base, draft, theirs);
        if (preview.conflicts.length === 0) {
          // Non-overlapping edits — merge silently.
          finalizeSave(preview.autoMerged);
          toast.success("Merged your edits with a teammate's changes");
          return;
        }
        // Real conflicts — hand off to the merge dialog.
        setMergePreview(preview);
        return;
      }
    }
    finalizeSave(draft);
  }

  async function finalizeSave(draft: Missionary) {
    const result = await upsertMissionary(draft);
    loadedUpdatedAt.current = new Date().toISOString();
    baseSnapshot.current = draft;
    setRemoteChanged(false);
    setMergePreview(null);
    if (result.ok) {
      toast.success(
        initial
          ? `${draft.fullName} updated — synced live to every device`
          : `${draft.fullName} added — synced live to every device`,
      );
    } else {
      toast.error(`Saved locally, but cloud sync failed: ${result.reason}`);
    }
    navigate({ to: "/manage", search: { tab: "missionaries", edit: undefined } });
    onDone();
  }


  return (
    <>
      {mergePreview ? (
        <ConflictMergeDialog<Missionary>
          preview={mergePreview}
          onCancel={() => setMergePreview(null)}
          onResolve={(resolved) => finalizeSave(resolved)}
        />
      ) : null}
    <Card className="card-soft p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">
          {initial ? "Edit missionary" : "Add missionary"}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close form"
          onClick={() => {
            navigate({ to: "/manage", search: { tab: "missionaries", edit: undefined } });
            onDone();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {dupe && !initial ? (
        <div role="alert" className="mb-4 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          A missionary named <strong>{dupe.fullName}</strong> already exists
          {areas.find((a) => a.id === dupe.areaId)?.name ? ` in ${areas.find((a) => a.id === dupe.areaId)?.name}` : ""}.
          Consider editing that record instead of creating a duplicate.
        </div>
      ) : fuzzyMatches.length && !initial ? (
        <div role="alert" className="mb-4 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Possible duplicate(s):{" "}
          {fuzzyMatches.map((f, i) => (
            <span key={f.missionary.id}>
              {i > 0 ? ", " : ""}
              <strong>{f.missionary.fullName}</strong> ({Math.round(f.score * 100)}%)
            </span>
          ))}
          . Please double-check the spelling before saving.
        </div>
      ) : null}

      {remoteChanged ? (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <span>Another admin just updated this missionary. Save will overwrite unless you reload.</span>
          <Button size="sm" variant="outline" className="ml-auto rounded-full" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      ) : null}

      {provinceMismatch ? (
        <div role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-100">
          Location mismatch: area <strong>{selectedArea?.name}</strong> is in{" "}
          <strong>{provinceMismatch.areaProvince}</strong>, but you entered{" "}
          <strong>{provinceMismatch.entered}</strong>. Fix the province or pick a different area.
        </div>
      ) : null}




      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name*" error={errors.fullName}>
          <Input value={form.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} />
        </Field>
        <Field label="Church*" error={errors.church}>
          <Input value={form.church ?? ""} onChange={(e) => set("church", e.target.value)} />
        </Field>
        <Field label="Area*" error={errors.areaId}>
          <Select value={form.areaId ?? ""} onValueChange={(v) => set("areaId", v)}>
            <SelectTrigger><SelectValue placeholder="Choose area" /></SelectTrigger>
            <SelectContent>
              {areas.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status ?? "Active"} onValueChange={(v) => set("status", v as Missionary["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Active", "On Leave", "Retired", "Transferred", "Completed"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Address*" error={errors.address} className="sm:col-span-2">
          <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Mission statement*" error={errors.missionStatement} className="sm:col-span-2">
          <Textarea rows={3} value={form.missionStatement ?? ""} onChange={(e) => set("missionStatement", e.target.value)} />
        </Field>
        <Field label="Photo URL" className="sm:col-span-2">
          <PhotoUrlUpload
            value={form.photo ?? ""}
            onChange={(v) => set("photo", v)}
            missionaryId={form.id || "new"}
          />
        </Field>
        <Field label="Ministry focus">
          <Select value={form.ministryFocus ?? ""} onValueChange={(v) => set("ministryFocus", v as Missionary["ministryFocus"])}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {["Church Planting","Campus Ministry","Children's Ministry","Tribal Ministry","Urban Ministry","Cross-Cultural Ministry","Youth Ministry","Family Ministry","Discipleship","Other"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email" error={errors.email}><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Province"><Input value={form.province ?? ""} onChange={(e) => set("province", e.target.value)} /></Field>
        <Field label="Municipality"><Input value={form.municipality ?? ""} onChange={(e) => set("municipality", e.target.value)} /></Field>
        <Field label="Barangay"><Input value={form.barangay ?? ""} onChange={(e) => set("barangay", e.target.value)} /></Field>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => {
            navigate({ to: "/manage", search: { tab: "missionaries", edit: undefined } });
            onDone();
          }}
        >
          Cancel
        </Button>
        <Button onClick={save} className="rounded-full">
          <Save className="h-4 w-4" /> Save
        </Button>
      </div>
    </Card>
    </>
  );
}

function PhotoUrlUpload({
  value,
  onChange,
  missionaryId,
}: {
  value: string;
  onChange: (v: string) => void;
  missionaryId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large. Max 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `manual/${missionaryId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("missionary-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const signed = await createDisplayUrl("missionary-photos", path);
      if (!signed) throw new Error("Could not sign uploaded photo URL.");
      onChange(signed);
      toast.success("Photo uploaded. It will save with the missionary.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or click Upload"
          className="min-w-[220px] flex-1"
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) upload(f);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Uploading…" : "Upload photo"}
        </Button>
      </div>
      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt="Photo preview"
            className="h-16 w-16 rounded-lg object-cover ring-1 ring-border"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <p className="text-xs text-muted-foreground">
            Face preview — pastors will see their face on the front.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const id = label.replace(/\W+/g, "-").toLowerCase();
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </Label>
      <div id={id}>{children}</div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

// ---------- Areas ----------------------------------------------------------

function AreaSection({ store }: { store: ReturnType<typeof useDataStore> }) {
  const [form, setForm] = useState<Partial<Area>>({ phaseId: store.phases[0]?.id ?? "" });

  function save() {
    if (!form.name || !form.phaseId) {
      toast.error("Name and Phase are required");
      return;
    }
    upsertArea({
      id: form.id || `area-${slug(form.name)}-${Date.now().toString(36)}`,
      phaseId: form.phaseId,
      name: form.name,
      region: form.region,
      province: form.province,
      description: form.description,
    });
    toast.success("Area saved");
    setForm({ phaseId: form.phaseId });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="card-soft p-5">
        <h2 className="mb-3 font-display text-xl font-semibold">Existing areas</h2>
        <ul className="divide-y divide-border">
          {store.areas.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 py-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{a.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {store.phases.find((p) => p.id === a.phaseId)?.name ?? "—"}
                  {a.province ? ` · ${a.province}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" onClick={() => setForm(a)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Delete ${a.name}`}
                  onClick={() => {
                    if (!confirm(`Delete area "${a.name}"?`)) return;
                    const res = deleteArea(a.id);
                    if (!res.ok) { toast.error(res.reason); return; }
                    if (form.id === a.id) setForm({ phaseId: form.phaseId });
                    toast.success("Area deleted");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {store.areas.length === 0 ? (
            <li className="py-6 text-center text-sm text-muted-foreground">No areas yet.</li>
          ) : null}
        </ul>
      </Card>
      <Card className="card-soft p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">
          {form.id ? "Edit area" : "New area"}
        </h2>
        <div className="grid gap-3">
          <Field label="Phase">
            <Select value={form.phaseId ?? ""} onValueChange={(v) => setForm({ ...form, phaseId: v })}>
              <SelectTrigger><SelectValue placeholder="Choose phase" /></SelectTrigger>
              <SelectContent>
                {store.phases.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Province"><Input value={form.province ?? ""} onChange={(e) => setForm({ ...form, province: e.target.value })} /></Field>
          <Field label="Region"><Input value={form.region ?? ""} onChange={(e) => setForm({ ...form, region: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {form.id ? (
            <Button variant="outline" className="rounded-full" onClick={() => setForm({ phaseId: form.phaseId })}>New</Button>
          ) : null}
          <Button onClick={save} className="rounded-full"><Plus className="h-4 w-4" /> Save area</Button>
        </div>
      </Card>
    </div>
  );
}

// ---------- Phases ---------------------------------------------------------

function PhaseSection({ store }: { store: ReturnType<typeof useDataStore> }) {
  const [form, setForm] = useState<Partial<Phase>>({ order: store.phases.length + 1 });

  function save() {
    if (!form.name) {
      toast.error("Phase name required");
      return;
    }
    upsertPhase({
      id: form.id || `phase-${slug(form.name)}-${Date.now().toString(36)}`,
      name: form.name,
      order: form.order ?? store.phases.length + 1,
      description: form.description,
    });
    toast.success("Phase saved");
    setForm({ order: (store.phases.length + 1) + 1 });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="card-soft p-5">
        <h2 className="mb-3 font-display text-xl font-semibold">Existing phases</h2>
        <ul className="divide-y divide-border">
          {store.phases.sort((a, b) => a.order - b.order).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{p.name}</div>
                {p.description ? <div className="truncate text-xs text-muted-foreground">{p.description}</div> : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" onClick={() => setForm(p)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Delete ${p.name}`}
                  onClick={() => {
                    if (!confirm(`Delete phase "${p.name}"?`)) return;
                    const res = deletePhase(p.id);
                    if (!res.ok) { toast.error(res.reason); return; }
                    if (form.id === p.id) setForm({ order: store.phases.length });
                    toast.success("Phase deleted");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="card-soft p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">{form.id ? "Edit phase" : "New phase"}</h2>
        <div className="grid gap-3">
          <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Order"><Input type="number" value={form.order ?? 1} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></Field>
          <Field label="Description"><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {form.id ? (
            <Button variant="outline" className="rounded-full" onClick={() => setForm({ order: store.phases.length + 1 })}>New</Button>
          ) : null}
          <Button onClick={save} className="rounded-full"><Plus className="h-4 w-4" /> Save phase</Button>
        </div>
      </Card>
    </div>
  );
}
