import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, Plus, Trash2, Eye, EyeOff, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Scripture {
  id: string;
  reference: string;
  text: string;
  active: boolean;
  sort_order: number;
}

/**
 * Admin-only Scripture of the Day management. Verses rotate deterministically
 * by day-of-year, so the ordering and active flag directly control the schedule.
 */
export function ScriptureManager() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["scriptures", "manage"],
    queryFn: async (): Promise<Scripture[]> => {
      const { data, error } = await supabase
        .from("scriptures")
        .select("id, reference, text, active, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const add = useMutation({
    mutationFn: async (v: { reference: string; text: string; sort_order: number }) => {
      const { error } = await supabase.from("scriptures").insert(v);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Scripture added.");
      qc.invalidateQueries({ queryKey: ["scriptures"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (s: Scripture) => {
      const { error } = await supabase
        .from("scriptures")
        .update({ active: !s.active })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scriptures"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setOrder = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase.from("scriptures").update({ sort_order }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scriptures"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scriptures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Scripture removed.");
      qc.invalidateQueries({ queryKey: ["scriptures"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) return null;

  const items = data ?? [];
  const activeCount = items.filter((s) => s.active).length;
  const today = new Date();
  const dayIndex = Math.floor(
    (today.getTime() - Date.UTC(today.getUTCFullYear(), 0, 0)) / 86400000,
  );
  const currentIndex = activeCount ? dayIndex % activeCount : 0;
  const activeSorted = items.filter((s) => s.active);
  const currentToday = activeSorted[currentIndex]?.id;

  return (
    <Card className="card-soft p-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold">Scripture of the Day</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="rounded-full">
            <Calendar className="h-3 w-3" /> {activeCount} active
          </Badge>
          <span className="text-muted-foreground">
            Rotation: 1 verse per day, ordered by rank.
          </span>
        </div>
      </div>

      <AddForm
        onAdd={(v) => add.mutate({ ...v, sort_order: (items.at(-1)?.sort_order ?? 0) + 1 })}
        busy={add.isPending}
      />

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading verses…
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No scriptures yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((s) => (
            <li
              key={s.id}
              className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border p-3 ${
                s.id === currentToday ? "border-primary/40 bg-primary/5" : "border-border"
              }`}
            >
              <Input
                type="number"
                value={s.sort_order}
                onChange={(e) =>
                  setOrder.mutate({ id: s.id, sort_order: Number(e.target.value) || 0 })
                }
                className="h-8 w-16 text-xs"
                aria-label="Sort order"
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-primary">
                  {s.reference}
                  {s.id === currentToday ? (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px]">
                      Today
                    </span>
                  ) : null}
                </div>
                <p className={`truncate text-sm ${s.active ? "" : "text-muted-foreground line-through"}`}>
                  {s.text}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggle.mutate(s)}
                  aria-label={s.active ? "Deactivate" : "Activate"}
                >
                  {s.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm("Delete this scripture?")) del.mutate(s.id);
                  }}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AddForm({
  onAdd,
  busy,
}: {
  onAdd: (v: { reference: string; text: string }) => void;
  busy: boolean;
}) {
  const [reference, setReference] = useState("");
  const [text, setText] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!reference.trim() || !text.trim()) {
      toast.error("Reference and text are both required.");
      return;
    }
    onAdd({ reference: reference.trim(), text: text.trim() });
    setReference("");
    setText("");
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:grid-cols-[180px_1fr_auto] sm:items-end"
      aria-label="Add scripture"
    >
      <div className="grid gap-1">
        <Label htmlFor="sc-ref" className="text-xs">Reference</Label>
        <Input
          id="sc-ref"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="John 3:16"
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="sc-text" className="text-xs">Verse text</Label>
        <Textarea
          id="sc-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="For God so loved the world…"
          className="min-h-[44px]"
        />
      </div>
      <Button type="submit" disabled={busy} className="rounded-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add
      </Button>
    </form>
  );
}
