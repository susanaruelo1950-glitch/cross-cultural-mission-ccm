import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { purgeMissionary, restoreMissionary } from "@/lib/mission-data";

interface Entry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_email: string | null;
  summary: string | null;
  changes: Array<{ field: string; before: unknown; after: unknown }> | null;
  created_at: string;
}

export function AdminActivityLog() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Entry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<
    | { kind: "restore" | "purge"; entry: Entry }
    | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      setLoading(false);
      if (error) {
        console.warn("[activity-log] load failed:", error.message);
        return;
      }
      setRows((data ?? []) as unknown as Entry[]);
    }
    load();
    const channel = supabase
      .channel("activity_log_stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => setRows((prev) => [payload.new as unknown as Entry, ...prev].slice(0, 50)),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "activity_log" },
        (payload) =>
          setRows((prev) => prev.filter((e) => e.id !== (payload.old as { id?: string }).id)),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  async function runRestore(entry: Entry) {
    restoreMissionary(entry.entity_id);
    // Remove the delete log entry itself so the same delete can't be re-undone.
    const { error } = await supabase.from("activity_log").delete().eq("id", entry.id);
    if (error) toast.error(`Restored, but log entry remains: ${error.message}`);
    else toast.success("Restored — synced live to everyone");
  }

  async function runPurge(entry: Entry) {
    purgeMissionary(entry.entity_id);
    const { error } = await supabase.from("activity_log").delete().eq("id", entry.id);
    if (error) toast.error(`Purged, but log entry remains: ${error.message}`);
    else toast.success("Purged permanently — synced live to everyone");
  }

  return (
    <Card className="card-soft p-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-semibold">Activity Log</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Who added, edited, or deleted a missionary — and what changed. Admins can restore or purge
        deleted records; both actions sync live to every device.
      </p>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          rows.map((e) => {
            const isOpen = expanded === e.id;
            const hasDiff = Array.isArray(e.changes) && e.changes.length > 0;
            const canManageDelete =
              isAdmin && e.action === "delete" && e.entity_type === "missionary";
            return (
              <div key={e.id} className="rounded-xl border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full text-[10px] capitalize">
                    {e.action}
                  </Badge>
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {e.entity_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </span>
                  {e.actor_email ? (
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {e.actor_email}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1">{e.summary ?? e.entity_id}</div>
                {hasDiff ? (
                  <>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-1 h-auto p-0 text-xs"
                      onClick={() => setExpanded(isOpen ? null : e.id)}
                    >
                      {isOpen ? "Hide" : "Show"} {e.changes!.length} field change(s)
                    </Button>
                    {isOpen ? (
                      <ul className="mt-2 space-y-1 rounded-lg bg-muted/40 p-2 text-xs">
                        {e.changes!.map((c) => (
                          <li key={c.field}>
                            <strong>{c.field}:</strong>{" "}
                            <span className="text-muted-foreground line-through">
                              {truncate(c.before)}
                            </span>{" "}
                            → <span>{truncate(c.after)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                ) : null}
                {canManageDelete ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 rounded-full text-xs"
                      onClick={() => setConfirm({ kind: "restore", entry: e })}
                    >
                      <RotateCcw className="h-3 w-3" /> Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirm({ kind: "purge", entry: e })}
                    >
                      <Trash2 className="h-3 w-3" /> Purge permanently
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "restore" ? "Restore this missionary?" : "Purge permanently?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "restore"
                ? "The missionary will be brought back into the directory and mission map for every guest, supporter, and coordinator in realtime."
                : "This permanently removes the record from the cloud and adds a tombstone so it never re-appears on any device. This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirm?.kind === "purge"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              onClick={() => {
                if (!confirm) return;
                if (confirm.kind === "restore") void runRestore(confirm.entry);
                else void runPurge(confirm.entry);
                setConfirm(null);
              }}
            >
              {confirm?.kind === "restore" ? "Restore" : "Purge forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function truncate(v: unknown, max = 80): string {
  const s = v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v);
  return s.length > max ? s.slice(0, max) + "…" : s;
}
