import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Search as SearchIcon,
  Save,
  X,
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
import { toast } from "sonner";
import {
  deleteMissionary,
  normalizeName,
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Manage Directory</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Add or edit phases, areas, and missionaries. Changes save to this browser.
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
            <Button variant="ghost" size="icon" aria-label={`Edit ${m.fullName}`} asChild>
              <Link to="/manage" search={{ tab: "missionaries", edit: m.id }}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${m.fullName}`}
              onClick={() => {
                if (confirm(`Delete ${m.fullName}?`)) {
                  deleteMissionary(m.id);
                  toast.success("Missionary deleted");
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="p-8 text-center text-sm text-muted-foreground">No missionaries found.</li>
        ) : null}
      </ul>
    </div>
  );
}

function MissionaryForm({
  initial,
  areas,
  onDone,
}: {
  initial?: Missionary;
  areas: Area[];
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

  const set = <K extends keyof Missionary>(k: K, v: Missionary[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function save() {
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
    upsertMissionary(draft);
    toast.success(initial ? "Missionary updated" : "Missionary added");
    navigate({ to: "/manage", search: { tab: "missionaries", edit: undefined } });
    onDone();
  }

  return (
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
        <Field label="Photo URL">
          <Input value={form.photo ?? ""} onChange={(e) => set("photo", e.target.value)} placeholder="https://…" />
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
            <li key={a.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">
                  {store.phases.find((p) => p.id === a.phaseId)?.name ?? "—"}
                  {a.province ? ` · ${a.province}` : ""}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setForm(a)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
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
            <li key={p.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{p.name}</div>
                {p.description ? <div className="text-xs text-muted-foreground">{p.description}</div> : null}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setForm(p)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
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
