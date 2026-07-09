import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Activity,
  ChevronLeft,
  Search as SearchIcon,
  Filter,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { PermissionError } from "@/components/PermissionError";

export const Route = createFileRoute("/admin/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — Admin — Cross-Cultural Mission" },
      {
        name: "description",
        content:
          "Full audit trail of missionary, letter, update, and prayer changes across the Cross-Cultural Mission app.",
      },
    ],
  }),
  component: ActivityPage,
});

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

function ActivityPage() {
  const { user, isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<Entry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      setFetching(false);
      if (error) {
        console.warn("[activity] load failed:", error.message);
        return;
      }
      setRows((data ?? []) as unknown as Entry[]);
    }
    load();
    const channel = supabase
      .channel("activity_log_full")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_log" },
        (payload) => setRows((p) => [payload.new as unknown as Entry, ...p].slice(0, 500)),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const entityOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entity_type))).sort(),
    [rows],
  );
  const actionOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (entity !== "all" && r.entity_type !== entity) return false;
      if (action !== "all" && r.action !== action) return false;
      if (!needle) return true;
      return (
        (r.summary ?? "").toLowerCase().includes(needle) ||
        (r.actor_email ?? "").toLowerCase().includes(needle) ||
        r.entity_id.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, entity, action]);

  function exportCsv() {
    const header = "when,entity,action,actor,summary,changes\n";
    const body = filtered
      .map((r) => {
        const changes = r.changes ? r.changes.map((c) => `${c.field}: ${JSON.stringify(c.before)}→${JSON.stringify(c.after)}`).join(" | ") : "";
        return [
          new Date(r.created_at).toISOString(),
          r.entity_type,
          r.action,
          r.actor_email ?? "",
          (r.summary ?? "").replace(/"/g, '""'),
          changes.replace(/"/g, '""'),
        ]
          .map((v) => `"${v}"`)
          .join(",");
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `activity-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!user || !isAdmin) {
    return (
      <PermissionError
        title="Admins only"
        message="The activity log is restricted to administrators."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="rounded-full">
          <Link to="/admin"><ChevronLeft className="h-4 w-4" /> Back to admin</Link>
        </Button>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Activity Log</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Every admin add, edit, delete, and restore — with field-level diffs. Streams live.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="rounded-full">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </header>

      <Card className="card-soft p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search summary, actor, or id…"
              className="pl-9"
              aria-label="Search activity"
            />
          </div>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {entityOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actionOptions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="card-soft p-0">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">
            {filtered.length} {filtered.length === 1 ? "event" : "events"}
          </h2>
        </div>
        <div className="divide-y divide-border">
          {fetching ? (
            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No matching events.</p>
          ) : (
            filtered.map((e) => {
              const isOpen = expanded === e.id;
              const hasDiff = Array.isArray(e.changes) && e.changes.length > 0;
              return (
                <div key={e.id} className="p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full text-[10px] capitalize">
                      {e.action}
                    </Badge>
                    <Badge variant="outline" className="rounded-full text-[10px]">
                      {e.entity_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground" title={new Date(e.created_at).toLocaleString()}>
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
    </div>
  );
}

function truncate(v: unknown, max = 120): string {
  const s = v === null || v === undefined ? "—" : typeof v === "string" ? v : JSON.stringify(v);
  return s.length > max ? s.slice(0, max) + "…" : s;
}
