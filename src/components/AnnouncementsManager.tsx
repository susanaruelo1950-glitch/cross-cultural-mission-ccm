import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone, Plus, Trash2, Pencil, Save, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { NewsTicker } from "@/components/NewsTicker";

export interface Announcement {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  published: boolean;
  publish_at: string;
  expires_at: string | null;
  layer: string;
  created_at: string;
}

const KEY = ["announcements", "admin"] as const;

function fmt(dt: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AnnouncementsManager() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Announcement[]> => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("publish_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Nothing was deleted. You may not have permission, or the item was already removed.");
      }
    },
    onSuccess: () => {
      toast.success("Announcement deleted.");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePub = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("announcements").update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Card className="card-soft p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Events & Announcements</h2>
        </div>
        {!creating ? (
          <Button size="sm" className="rounded-full" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New announcement
          </Button>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Publish upcoming events and headlines. Live-published items appear on the dashboard news ticker for everyone.
      </p>

      {creating ? (
        <AnnouncementForm
          onDone={() => setCreating(false)}
        />
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (data ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No announcements yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {data!.map((a) => {
            const now = Date.now();
            const scheduled = new Date(a.publish_at).getTime() > now;
            const expired = a.expires_at && new Date(a.expires_at).getTime() < now;
            const live = a.published && !scheduled && !expired;
            return (
              <li key={a.id} className="rounded-2xl border border-border/70 p-4">
                {editingId === a.id ? (
                  <AnnouncementForm
                    announcement={a}
                    onDone={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="font-display text-base font-semibold">{a.title}</h4>
                      <div className="flex items-center gap-2">
                        {live ? (
                          <Badge className="rounded-full bg-secondary text-secondary-foreground">Live</Badge>
                        ) : scheduled ? (
                          <Badge variant="outline" className="rounded-full">Scheduled</Badge>
                        ) : expired ? (
                          <Badge variant="outline" className="rounded-full">Expired</Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full">Draft</Badge>
                        )}
                      </div>
                    </div>
                    {a.body ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{a.body}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        Publish: {fmt(a.publish_at)}
                        {a.expires_at ? ` · Expires: ${fmt(a.expires_at)}` : ""}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-full text-xs"
                          onClick={() => togglePub.mutate({ id: a.id, published: !a.published })}
                        >
                          {a.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {a.published ? "Unpublish" : "Publish"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-full text-xs"
                          onClick={() => setEditingId(a.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-full text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm("Delete this announcement?")) del.mutate(a.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function AnnouncementForm({
  announcement,
  onDone,
}: {
  announcement?: Announcement;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [linkUrl, setLinkUrl] = useState(announcement?.link_url ?? "");
  const [published, setPublished] = useState(announcement?.published ?? true);
  const [publishAt, setPublishAt] = useState(
    announcement ? announcement.publish_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
  );
  const [expiresAt, setExpiresAt] = useState(announcement?.expires_at?.slice(0, 16) ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        body: body.trim() || null,
        link_url: linkUrl.trim() || null,
        published,
        publish_at: new Date(publishAt).toISOString(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      if (announcement) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", announcement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("announcements").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(announcement ? "Announcement updated." : "Announcement posted.");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("Title is required.");
    save.mutate();
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="ann-title">Headline *</Label>
        <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={280} dir="ltr" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ann-body">Details (optional)</Label>
        <Textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[80px]" maxLength={2000} dir="ltr" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ann-link">Link (optional)</Label>
        <Input id="ann-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" dir="ltr" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="ann-pub">Publish at</Label>
          <Input id="ann-pub" type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ann-exp">Expires at (optional)</Label>
          <Input id="ann-exp" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={published} onCheckedChange={(v) => setPublished(Boolean(v))} /> Published
      </label>

      {title.trim() ? (
        <div className="rounded-xl border border-dashed border-primary/30 bg-background/60 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live preview — exactly as it will appear
          </div>
          <NewsTicker
            items={[{ id: "preview", text: title.trim(), href: linkUrl.trim() || undefined }]}
          />
          {body.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{body.trim()}</p>
          ) : null}
          <div className="mt-2 text-xs text-muted-foreground">
            Publishes {new Date(publishAt).toLocaleString()}
            {expiresAt ? ` · Expires ${new Date(expiresAt).toLocaleString()}` : ""}
            {!published ? " · Draft (not visible)" : ""}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={save.isPending} className="rounded-full">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {announcement ? "Save changes" : "Post announcement"}
        </Button>
        <Button type="button" variant="ghost" className="rounded-full" onClick={onDone}>
          <X className="h-4 w-4" /> Cancel
        </Button>
      </div>
    </form>
  );
}
