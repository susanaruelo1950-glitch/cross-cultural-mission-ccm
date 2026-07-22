import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Mail, Pencil, Save, Trash2, X } from "lucide-react";
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
 * Admin console for thank-you letters. Missionary picker, bulk & single
 * upload, drag-and-drop reorder, inline edit, and delete.
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
        .order("letter_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Local optimistic order so drag feels instant.
  const [order, setOrder] = useState<Row[]>([]);
  useEffect(() => {
    if (letters) setOrder(letters);
  }, [letters]);

  const reorderMut = useMutation({
    mutationFn: async (rows: Row[]) => {
      const payload = rows.map((r, i) => ({
        id: r.id,
        missionary_id: r.missionary_id,
        title: r.title,
        sort_order: i,
      }));
      const { error } = await supabase.from("thank_you_letters").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["thank_you_letters_admin", selectedId] });
      qc.invalidateQueries({ queryKey: ["thank_you_letters", selectedId] });
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
      qc.invalidateQueries({ queryKey: ["thank_you_letters_admin", selectedId] });
      qc.invalidateQueries({ queryKey: ["thank_you_letters", selectedId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((r) => r.id === active.id);
    const newIndex = order.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    // Snapshot the previous order so we can restore it on failure and keep
    // sort_order internally consistent.
    const previous = order;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    try {
      await reorderMut.mutateAsync(next);
    } catch (err) {
      setOrder(previous);
      toast.error(
        err instanceof Error
          ? `Reorder failed: ${err.message}. Restored previous order.`
          : "Reorder failed. Restored previous order.",
      );
    }
  }

  return (
    <Card className="card-soft p-6">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-semibold">Thank You Letters</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload (single or bulk), drag to reorder, edit, and delete thank-you letters for each missionary.
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
          {order.length} letter{order.length === 1 ? "" : "s"} on file.
          {reorderMut.isPending ? " Saving order…" : ""}
        </p>
      </div>

      {selected ? (
        <div className="mt-6">
          <ThankYouLetters missionaryId={selected.id} missionaryName={selected.fullName} />
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="font-display text-base font-semibold">Drag to reorder</h3>
        {isLoading ? (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading letters…
          </div>
        ) : order.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No letters to reorder yet.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order.map((o) => o.id)} strategy={verticalListSortingStrategy}>
              <ul className="mt-3 space-y-2">
                {order.map((l) => (
                  <SortableLetterRow
                    key={l.id}
                    letter={l}
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
            </SortableContext>
          </DndContext>
        )}
      </div>
    </Card>
  );
}

function SortableLetterRow({
  letter,
  onDelete,
  onSaved,
}: {
  letter: Row;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: letter.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(letter.title);
  const [message, setMessage] = useState(letter.message ?? "");
  const [letterDate, setLetterDate] = useState(letter.letter_date?.slice(0, 10) ?? "");
  const qc = useQueryClient();
  const key = ["thank_you_letters_admin", letter.missionary_id] as const;
  const publicKey = ["thank_you_letters", letter.missionary_id] as const;
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return toast.error("Title is required.");
    if (!letterDate || !/^\d{4}-\d{2}-\d{2}$/.test(letterDate)) {
      return toast.error("Please enter a valid date.");
    }
    setSaving(true);
    const prevAdmin = qc.getQueryData<Row[] | undefined>(key);
    const prevPublic = qc.getQueryData<Row[] | undefined>(publicKey);
    const patch = { title: title.trim(), message: message.trim() || null, letter_date: letterDate };
    // Optimistic
    await qc.cancelQueries({ queryKey: key });
    await qc.cancelQueries({ queryKey: publicKey });
    qc.setQueryData<Row[] | undefined>(key, (p) => p?.map((r) => (r.id === letter.id ? { ...r, ...patch } : r)));
    qc.setQueryData<Row[] | undefined>(publicKey, (p) => p?.map((r) => (r.id === letter.id ? { ...r, ...patch } : r)));
    try {
      const { error } = await supabase
        .from("thank_you_letters")
        .update(patch)
        .eq("id", letter.id);
      if (error) throw error;
      toast.success("Letter updated.");
      setEditing(false);
      onSaved();
    } catch (e) {
      qc.setQueryData(key, prevAdmin);
      qc.setQueryData(publicKey, prevPublic);
      toast.error(e instanceof Error ? `${e.message}. Reverted.` : "Update failed. Reverted.");
    } finally {
      setSaving(false);
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: publicKey });
    }
  }


  return (
    <li ref={setNodeRef} style={style} className="rounded-2xl border border-border/60 bg-card p-3">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Drag to reorder ${letter.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <div className="grid gap-1.5">
                <Label htmlFor={`tyl-date-${letter.id}`} className="text-xs">Letter date</Label>
                <Input
                  id={`tyl-date-${letter.id}`}
                  type="date"
                  value={letterDate}
                  onChange={(e) => setLetterDate(e.target.value)}
                />
              </div>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" className="min-h-[80px]" />
              <div className="flex gap-2">
                <Button size="sm" className="rounded-full" disabled={saving} onClick={save}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setEditing(false); setTitle(letter.title); setMessage(letter.message ?? ""); setLetterDate(letter.letter_date?.slice(0, 10) ?? ""); }}>
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
