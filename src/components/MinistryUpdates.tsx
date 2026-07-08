import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ImagePlus, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";

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

/**
 * DB-backed list + admin form for a missionary's ministry updates.
 * - Anyone can read
 * - Admin/Coordinator can add (with an optional image upload) or delete
 */
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
    onError: (e: Error) => toast.error(e.message),
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
              {u.image_url ? (
                <img
                  src={u.image_url}
                  alt=""
                  className="mt-3 max-h-80 w-full rounded-xl object-cover"
                  loading="lazy"
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
            </article>
          ))
        )}
      </div>
    </Card>
  );
}

function UpdateForm({ missionaryId }: { missionaryId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required.");
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${missionaryId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        image_url = pub.publicUrl;
      }

      const { error } = await supabase.from("ministry_updates").insert({
        missionary_id: missionaryId,
        title: title.trim(),
        summary: summary.trim() || null,
        body: body.trim() || null,
        image_url,
      });
      if (error) throw error;
      toast.success("Update posted.");
      setTitle("");
      setSummary("");
      setBody("");
      setFile(null);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["ministry_updates", missionaryId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post update.");
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
          <ImagePlus className="h-4 w-4" /> Photo (optional)
        </Label>
        <Input
          id="mu-photo"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <p className="text-xs text-muted-foreground">
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </p>
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
