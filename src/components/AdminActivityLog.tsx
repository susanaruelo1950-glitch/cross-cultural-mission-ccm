import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  const [rows, setRows] = useState<Entry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="card-soft p-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-semibold">Activity Log</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Who added, edited, or deleted a missionary — and what changed.
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
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

function truncate(v: unknown, max = 80): string {
  const s = v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v);
  return s.length > max ? s.slice(0, max) + "…" : s;
}
