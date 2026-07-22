import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Handshake, Loader2, Pencil, Plus, Save, Trash2, X, Eye, EyeOff, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Partner } from "@/hooks/use-partners";

const LOGO_BUCKET = "partner-logos";
const MAX_LOGO_MB = 3;
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10; // 10 years


const KEY = ["partners", "admin"] as const;

async function fetchAll(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Partner[];
}

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export function PartnersManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: KEY, queryFn: fetchAll });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["partners"] });
  };

  const save = useMutation({
    mutationFn: async (row: Partial<Partner> & { id?: string }) => {
      const payload = {
        slug: row.slug!,
        short_name: row.short_name!,
        full_name: row.full_name!,
        logo_url: row.logo_url || null,
        link_url: row.link_url || null,
        display_order: row.display_order ?? 0,
        active: row.active ?? true,
        updated_at: new Date().toISOString(),
      };
      if (row.id) {
        const { error } = await supabase.from("partners").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Partner saved.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Partner removed.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: -1 | 1 }) => {
      const rows = [...(data ?? [])].sort((a, b) => a.display_order - b.display_order);
      const idx = rows.findIndex((r) => r.id === id);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= rows.length) return;
      const a = rows[idx];
      const b = rows[swap];
      await Promise.all([
        supabase.from("partners").update({ display_order: b.display_order }).eq("id", a.id),
        supabase.from("partners").update({ display_order: a.display_order }).eq("id", b.id),
      ]);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className="card-soft p-6" id="partners-manager">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Partners</h2>
          <Badge variant="secondary" className="rounded-full">{data?.length ?? 0}</Badge>
        </div>
        <Button size="sm" className="rounded-full" onClick={() => { setCreating(true); setEditingId(null); }}>
          <Plus className="h-4 w-4" /> Add partner
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload a logo URL, set the link, and choose display order. Everything syncs live to the dashboard.
      </p>

      {creating ? (
        <PartnerForm
          initial={{ slug: "", short_name: "", full_name: "", logo_url: "", link_url: "", display_order: (data?.length ?? 0) + 1, active: true }}
          onCancel={() => setCreating(false)}
          onSubmit={(v) => save.mutate(v, { onSuccess: () => setCreating(false) })}
          saving={save.isPending}
        />
      ) : null}

      <div className="mt-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No partners yet.</p>
        ) : (
          (data ?? []).map((p, i, arr) => (
            <div key={p.id} className="rounded-xl border border-border p-3">
              {editingId === p.id ? (
                <PartnerForm
                  initial={p}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(v) => save.mutate({ ...v, id: p.id }, { onSuccess: () => setEditingId(null) })}
                  saving={save.isPending}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt={`${p.short_name} logo`} className="h-full w-full object-contain p-1" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">{p.short_name.slice(0, 3)}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-medium">{p.short_name}</div>
                      {!p.active ? <Badge variant="outline" className="text-xs">hidden</Badge> : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{p.full_name}</div>
                    {p.link_url ? (
                      <div className="truncate text-xs text-primary">{p.link_url}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" title="Move up" disabled={i === 0} onClick={() => move.mutate({ id: p.id, dir: -1 })}><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Move down" disabled={i === arr.length - 1} onClick={() => move.mutate({ id: p.id, dir: 1 })}><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title={p.active ? "Hide" : "Show"} onClick={() => save.mutate({ ...p, active: !p.active })}>
                      {p.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingId(p.id); setCreating(false); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm(`Remove ${p.short_name}?`)) del.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function PartnerForm({
  initial, onCancel, onSubmit, saving,
}: {
  initial: Partial<Partner>;
  onCancel: () => void;
  onSubmit: (v: Partial<Partner>) => void;
  saving: boolean;
}) {
  const [short, setShort] = useState(initial.short_name ?? "");
  const [full, setFull] = useState(initial.full_name ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [logo, setLogo] = useState(initial.logo_url ?? "");
  const [link, setLink] = useState(initial.link_url ?? "");
  const [order, setOrder] = useState<number>(initial.display_order ?? 0);
  const [active, setActive] = useState<boolean>(initial.active ?? true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!short.trim() || !full.trim()) { toast.error("Short name and full name are required."); return; }
    onSubmit({
      slug: (slug || slugify(short)).trim(),
      short_name: short.trim(),
      full_name: full.trim(),
      logo_url: logo.trim(),
      link_url: link.trim(),
      display_order: Number(order) || 0,
      active,
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-1">
        <Label>Short name</Label>
        <Input value={short} onChange={(e) => { setShort(e.target.value); if (!initial.id && !slug) setSlug(slugify(e.target.value)); }} placeholder="CBCP" required />
      </div>
      <div className="sm:col-span-1">
        <Label>Full name</Label>
        <Input value={full} onChange={(e) => setFull(e.target.value)} placeholder="Christian Bible Church of the Philippines" required />
      </div>
      <div className="sm:col-span-1">
        <Label>Slug</Label>
        <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="cbcp" />
      </div>
      <div className="sm:col-span-1">
        <Label>Display order</Label>
        <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
      </div>
      <div className="sm:col-span-2">
        <Label>Logo URL</Label>
        <Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png" />
        {logo ? (
          <div className="mt-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border">
            <img src={logo} alt="Logo preview" className="h-full w-full object-contain p-1" />
          </div>
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <Label>Link URL (optional)</Label>
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Visible on dashboard
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={saving} className="rounded-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="rounded-full">
          <X className="h-4 w-4" /> Cancel
        </Button>
      </div>
    </form>
  );
}
