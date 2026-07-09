import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { History, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { upsertMissionary, type Missionary } from "@/lib/mission-data";
import { logActivity } from "@/lib/activity-log";

interface Version {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  snapshot: Record<string, unknown>;
  created_at: string;
  changed_by: string | null;
}

export function AdminHistoryDrawer() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [rows, setRows] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("content_versions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("entity_type", filter);
      const { data, error } = await q;
      if (cancelled) return;
      setLoading(false);
      if (error) {
        toast.error("Couldn't load history: " + error.message);
        return;
      }
      setRows((data ?? []) as unknown as Version[]);
    })();

    const channel = supabase
      .channel("content_versions_history")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "content_versions" },
        (payload) => {
          setRows((prev) => [payload.new as unknown as Version, ...prev].slice(0, 100));
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [open, filter]);

  async function restore(v: Version) {
    if (!confirm(`Restore this ${v.entity_type} to its previous version?`)) return;
    try {
      if (v.entity_type === "missionary") {
        const snap = v.snapshot as unknown as Missionary;
        upsertMissionary(snap);
      } else if (v.entity_type === "thank_you_letter" || v.entity_type === "ministry_update" || v.entity_type === "prayer_request") {
        // Restore by writing the snapshot fields back to the source table.
        const tableMap: Record<string, string> = {
          thank_you_letter: "thank_you_letters",
          ministry_update: "ministry_updates",
          prayer_request: "prayer_requests_db",
        };
        const table = tableMap[v.entity_type];
        const { id, created_at: _c, updated_at: _u, ...rest } = v.snapshot as Record<string, unknown>;
        void _c; void _u;
        const { error } = await supabase.from(table as never).upsert({ id, ...rest } as never, { onConflict: "id" });
        if (error) throw error;
      }
      await logActivity({
        entityType: v.entity_type,
        entityId: v.entity_id,
        action: "restore",
        summary: `Restored ${v.entity_type} to version from ${new Date(v.created_at).toLocaleString()}`,
      });
      toast.success("Version restored");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Restore failed: " + msg);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <History className="h-4 w-4" /> History
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Content History</SheetTitle>
          <SheetDescription>Browse past versions and restore with one click.</SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All content types</SelectItem>
              <SelectItem value="missionary">Missionaries</SelectItem>
              <SelectItem value="thank_you_letter">Thank-you letters</SelectItem>
              <SelectItem value="ministry_update">Ministry updates</SelectItem>
              <SelectItem value="prayer_request">Prayer requests</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No version history yet.</p>
          ) : (
            rows.map((v) => {
              const label =
                (v.snapshot as { fullName?: string; title?: string; body?: string })?.fullName ??
                (v.snapshot as { title?: string })?.title ??
                (v.snapshot as { body?: string })?.body?.slice(0, 60) ??
                v.entity_id;
              return (
                <Card key={v.id} className="card-soft p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="rounded-full text-[10px]">
                          {v.entity_type.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                          {v.action.toLowerCase()}
                        </Badge>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-sm font-medium">{label}</div>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => restore(v)}>
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
