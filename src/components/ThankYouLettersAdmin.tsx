import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Mail, Pencil, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDataStore } from "@/hooks/use-data-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThankYouLetters } from "@/components/ThankYouLetters";

interface Row {
  id: string;
  missionary_id: string;
  title: string;
  message: string | null;
  letter_url: string | null;
  letter_date: string;
  sort_order: number;
}

/**
 * Admin console for thank-you letters. Lets an admin pick a missionary,
 * upload new letters (reusing the profile-side form), reorder them, edit
 * title/message inline, and delete.
 */
export function ThankYouLettersAdmin() {
  const { missionaries } = useDataStore();
  const sorted = useMemo(
    () => [...missionaries].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [missionaries],
  );
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id ?? "");
  const selected = sorted.find((m) => m.id === selectedId);
  const qc = useQueryClient();

  const { data: letters, isLoading } = useQuery({
    queryKey: ["thank_you_letters_admin", selectedId],
    enabled: !!selectedId,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("thank_you_letters")
        .select("id, missionary_id, title, message, letter_url, letter_date, sort_order")
        .eq("missionary_id", selectedId)
        .order("sort_order", { ascending: true })
        .order("letter_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const swap = useMutation({
    mutationFn: async ({ a, b }: { a: Row; b: Row }) => {
      const { error } = await supabase.from("thank_you_letters").upsert([
        { id: a.id, missionary_id: a.missionary_id, title: a.title, sort_order: b.sort_order },
        { id: b.id, missionary_id: b.missionary_id, title: b.title, sort_order: a.sort_order },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thank_you_letters_admin", selectedId] });
      qc.invalidateQueries({ queryKey: ["thank_you_letters", selectedId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("thank_you_letters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Letter deleted.");
      qc.invalidateQueries({ queryKey: ["thank_you_letters_admin", selectedId] });
      qc.invalidateQueries({ queryKey: ["thank_you_letters", selectedId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function move(idx: number, dir: -1 | 1) {
    if (!letters) return;
    const j = idx + dir;
    if (j < 0 || j >= letters.length) return;
    const a = letters[idx];
    const b = letters[j];
    // Ensure distinct sort_order values before swapping.
    if (a.sort_order === b.sort_order) {
      a.sort_order = idx;
      b.sort_order = j;
    }
    swap.mutate({ a, b });
  }

  return (
    <Card className="card-soft p-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-semibold">Thank You Letters</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload, reorder, edit, and delete thank-you letters for each missionary.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,320px)_1fr] sm:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="tyl-admin-select">Missionary</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger id="tyl-admin-select"><SelectValue placeholder="Select a missionary" /></SelectTrigger>
            <SelectContent>
              {sorted.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          {letters?.length ?? 0} letter{(letters?.length ?? 0) === 1 ? "" : "s"} on file.
        </p>
      </div>

      {selected ? (
        <div className="mt-6">
          <ThankYouLetters missionaryId={selected.id} missionaryName={selected.fullName} />
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="font-display text-base font-semibold">Reorder & edit</h3>
        {isLoading ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading letters…
          </div>
        ) : !letters || letters.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No letters to reorder yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {letters.map((l, idx) => (
              <LetterAdminRow
                key={l.id}
                letter={l}
                canMoveUp={idx > 0}
                canMoveDown={idx < letters.length - 1}
                onMove={(dir) => move(idx, dir)}
                onDelete={() => {
                  if (confirm("Delete this letter?")) del.mutate(l.id);
                }}
                onSaved={() => {
                  qc.invalidateQueries({ queryKey: ["thank_you_letters_admin", selectedId] });
                  qc.invalidateQueries({ queryKey: ["thank_you_letters", selectedId] });
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function LetterAdminRow({
  letter,
  canMoveUp,
  canMoveDown,
  onMove,
  onDelete,
  onSaved,
}: {
  letter: Row;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(letter.title);
  const [message, setMessage] = useState(letter.message ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return toast.error("Title is required.");
    setSaving(true);
    try {
      const { error } = await supabase
        .from("thank_you_letters")
        .update({ title: title.trim(), message: message.trim() || null })
        .eq("id", letter.id);
      if (error) throw error;
      toast.success("Letter updated.");
      setEditing(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-2xl border border-border/60 bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!canMoveUp} onClick={() => onMove(-1)} aria-label="Move up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!canMoveDown} onClick={() => onMove(1)} aria-label="Move down">
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" className="min-h-[80px]" />
              <div className="flex gap-2">
                <Button size="sm" className="rounded-full" disabled={saving} onClick={save}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setEditing(false); setTitle(letter.title); setMessage(letter.message ?? ""); }}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {new Date(letter.letter_date).toLocaleDateString()}
              </div>
              <div className="truncate font-medium">{letter.title}</div>
              {letter.message ? (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{letter.message}</p>
              ) : null}
            </>
          )}
        </div>
        {!editing ? (
          <div className="flex flex-col gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)} aria-label="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={onDelete} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
