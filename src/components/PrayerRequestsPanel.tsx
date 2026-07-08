import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Sparkles, AlertTriangle, Check, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export interface DbPrayer {
  id: string;
  missionary_id: string;
  title: string;
  detail: string | null;
  urgent: boolean;
  answered: boolean;
  created_at: string;
}

interface Props {
  /** Restrict to a single missionary. Omit for the global Prayer Center. */
  missionaryId?: string;
  missionaryName?: string;
}

/**
 * DB-backed prayer requests panel:
 * - Anyone can read
 * - Admins can post / mark answered / delete for any missionary
 * - Coordinators can post / mark answered for missionaries in their assigned area
 */
export function PrayerRequestsPanel({ missionaryId, missionaryName }: Props) {
  const { canEdit, isAdmin, user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["prayer_requests_db", missionaryId ?? "__all__"],
    queryFn: async (): Promise<DbPrayer[]> => {
      let q = supabase
        .from("prayer_requests_db")
        .select("id, missionary_id, title, detail, urgent, answered, created_at")
        .order("urgent", { ascending: false })
        .order("created_at", { ascending: false });
      if (missionaryId) q = q.eq("missionary_id", missionaryId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggleAnswered = useMutation({
    mutationFn: async ({ id, answered }: { id: string; answered: boolean }) => {
      const { error } = await supabase
        .from("prayer_requests_db")
        .update({ answered })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prayer_requests_db"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prayer_requests_db").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prayer request removed.");
      qc.invalidateQueries({ queryKey: ["prayer_requests_db"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data ?? [];
  const urgent = items.filter((p) => p.urgent && !p.answered);
  const active = items.filter((p) => !p.answered);
  const answered = items.filter((p) => p.answered);

  return (
    <Card className="card-soft p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="font-display text-xl font-semibold">Prayer Requests</h3>
          <p className="text-xs text-muted-foreground">
            {missionaryName
              ? `Praying with ${missionaryName}. Requests below load from the database.`
              : "All open prayer requests across every missionary."}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <Badge variant="destructive" className="rounded-full">{urgent.length} urgent</Badge>
          <Badge variant="secondary" className="rounded-full">{active.length} active</Badge>
          <Badge className="rounded-full bg-secondary text-secondary-foreground">{answered.length} answered</Badge>
        </div>
      </div>

      {canEdit && missionaryId ? (
        <PrayerForm missionaryId={missionaryId} />
      ) : !user ? (
        <p className="mb-3 text-xs text-muted-foreground">Sign in as an admin or assigned coordinator to add a request.</p>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading prayer requests…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Could not load prayer requests.</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No prayer requests yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li
              key={p.id}
              className={`rounded-2xl border p-4 ${
                p.answered
                  ? "border-secondary/40 bg-accent"
                  : p.urgent
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-display text-base font-semibold">{p.title}</h4>
                <div className="flex items-center gap-2">
                  {p.urgent && !p.answered ? (
                    <Badge variant="destructive" className="rounded-full">
                      <AlertTriangle className="h-3 w-3" /> Urgent
                    </Badge>
                  ) : null}
                  {p.answered ? (
                    <Badge className="rounded-full bg-secondary text-secondary-foreground">
                      <Sparkles className="h-3 w-3" /> Answered
                    </Badge>
                  ) : null}
                </div>
              </div>
              {p.detail ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{p.detail}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{new Date(p.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                {canEdit ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-full text-xs"
                      onClick={() => toggleAnswered.mutate({ id: p.id, answered: !p.answered })}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {p.answered ? "Mark active" : "Mark answered"}
                    </Button>
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-full text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm("Delete this prayer request?")) del.mutate(p.id);
                        }}
                        aria-label="Delete prayer request"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PrayerForm({ missionaryId }: { missionaryId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required.");
    setBusy(true);
    try {
      const { error } = await supabase.from("prayer_requests_db").insert({
        missionary_id: missionaryId,
        title: title.trim(),
        detail: detail.trim() || null,
        urgent,
      });
      if (error) throw error;
      toast.success("Prayer request posted.");
      setTitle("");
      setDetail("");
      setUrgent(false);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["prayer_requests_db"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post prayer request.";
      toast.error(
        msg.includes("row-level")
          ? "You don't have permission to add a prayer request for this missionary."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm" className="mb-4 rounded-full">
        <Plus className="h-4 w-4" /> New prayer request
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mb-4 space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
      aria-label="Post prayer request"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="pr-title">Title *</Label>
        <Input id="pr-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pr-detail">Details</Label>
        <Textarea
          id="pr-detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="How can supporters be praying?"
          className="min-h-[100px]"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={urgent} onCheckedChange={(v) => setUrgent(Boolean(v))} /> Mark as urgent
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy} className="rounded-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {busy ? "Posting…" : "Post request"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-full">
          Cancel
        </Button>
      </div>
    </form>
  );
}
