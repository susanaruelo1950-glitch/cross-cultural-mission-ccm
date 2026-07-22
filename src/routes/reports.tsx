import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMinistryUpdatesList, type LiveUpdate } from "@/hooks/use-ministry-updates";

import { FileText, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/EmptyState";
import { getMissionary } from "@/lib/mission-data";
import { useHashScroll } from "@/hooks/use-hash-scroll";
import { monthKey, monthLabel } from "@/lib/month-key";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";


export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Ministry Reports — Cross-Cultural Ministry" },
      { name: "description", content: "Live feed of every ministry update submitted by Cross-Cultural Ministry church planter pastors." },
      { property: "og:title", content: "Ministry Reports — Cross-Cultural Ministry" },
      { property: "og:description", content: "Live feed of every ministry update submitted by Cross-Cultural Ministry church planter pastors." },
      { property: "og:url", content: "https://cross-cultural-mission-ccm.lovable.app/reports" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
      { name: "twitter:title", content: "Ministry Reports — Cross-Cultural Ministry" },
      { name: "twitter:description", content: "Live feed of every ministry update submitted by Cross-Cultural Ministry church planter pastors." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cross-cultural-mission-ccm.lovable.app/reports" }],
  }),
  component: ReportsPage,
});

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function ReportsPage() {
  const { data, isLoading } = useMinistryUpdatesList();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [scope, setScope] = useState<"month" | "all">("month");
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const list: LiveUpdate[] = Array.isArray(data) ? data : [];
    const map = new Map<string, { key: string; label: string; items: LiveUpdate[] }>();
    for (const u of list) {
      const dateSrc = u.report_date ?? u.created_at;
      const key = monthKey(dateSrc);
      const label = key === "0000-00" ? "Undated" : monthLabel(key);
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key)!.items.push(u);
    }
    const groups = Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
    for (const g of groups) {
      g.items.sort((a, b) => {
        const ad = a.report_date ?? a.created_at.slice(0, 10);
        const bd = b.report_date ?? b.created_at.slice(0, 10);
        if (ad !== bd) return bd.localeCompare(ad);
        return b.created_at.localeCompare(a.created_at);
      });
    }
    return groups;
  }, [data]);

  useHashScroll(grouped.length);

  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  async function handleClear() {
    if (!isAdmin) return;
    setBusy(true);
    try {
      const list: LiveUpdate[] = Array.isArray(data) ? data : [];
      const ids = list
        .filter((u) => {
          if (scope === "all") return true;
          const src = u.report_date ?? u.created_at;
          return typeof src === "string" && src.slice(0, 7) === currentMonth;
        })
        .map((u) => u.id);
      if (ids.length === 0) {
        toast.info("Nothing to clear.");
        return;
      }
      const { error } = await supabase.from("ministry_updates").delete().in("id", ids);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["ministry_updates"] });
      try {
        window.localStorage.removeItem("gc.notifications.v2");
        window.dispatchEvent(new StorageEvent("storage", { key: "gc.notifications.v2" }));
      } catch { /* noop */ }
      toast.success(`Cleared ${ids.length} ministry ${ids.length === 1 ? "update" : "updates"}.`);
    } catch (e) {
      toast.error("Failed to clear updates", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Ministry Reports</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Live feed of ministry updates from every field — grouped by month, latest first.
            Updates in real-time as pastors post from their profiles.
          </p>
        </div>
        {isAdmin && grouped.length > 0 ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" disabled={busy}>
                <Trash2 className="h-4 w-4" /> Clear reports
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear ministry reports?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes ministry updates so the feed and notifications reset.
                  Choose the scope below. Thank-you letters, receipts, and prayer requests are untouched.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="scope" checked={scope === "month"} onChange={() => setScope("month")} />
                  Only this month ({monthLabel(currentMonth)})
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} />
                  All ministry updates
                </label>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </header>


      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading latest updates…
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState icon={FileText} title="No updates yet" description="Ministry updates will appear here as pastors post them." />
      ) : (
        <div id="reports-list" data-section-anchor className="space-y-8">
          {grouped.map((g) => (
            <section key={g.key} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-semibold">{g.label}</h2>
                <Badge variant="secondary" className="rounded-full">{g.items.length}</Badge>
              </div>
              <div className="grid gap-4">
                {g.items.map((r) => {
                  const m = getMissionary(r.missionary_id);
                  const dateStr = r.report_date ?? r.created_at.slice(0, 10);
                  return (
                    <Card key={r.id} className="card-soft p-5">
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
                        {m ? (
                          <Avatar className="h-11 w-11">
                            <AvatarImage src={m.photo} alt={m.fullName} />
                            <AvatarFallback className="bg-primary/10 text-primary">{initials(m.fullName)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar className="h-11 w-11">
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-semibold">{r.title}</h3>
                          {m ? (
                            <Link to="/missionaries/$id" params={{ id: m.id }} className="text-sm text-primary hover:underline">
                              {m.fullName}{m.church ? ` · ${m.church}` : ""}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground">{r.missionary_id}</span>
                          )}
                          {r.summary ? (
                            <p className="mt-2 line-clamp-3 text-sm text-foreground/90">{r.summary}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="whitespace-nowrap text-xs text-muted-foreground">{dateStr}</span>
                          {m ? (
                            <Link
                              to="/missionaries/$id"
                              params={{ id: m.id }}
                              hash="ministry-updates"
                              className="text-xs text-primary hover:underline"
                            >
                              View →
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
