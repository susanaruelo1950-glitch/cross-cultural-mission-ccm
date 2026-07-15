import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMinistryUpdatesList, type LiveUpdate } from "@/hooks/use-ministry-updates";

import { FileText, ImageIcon, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { getMissionary } from "@/lib/mission-data";
import { useHashScroll } from "@/hooks/use-hash-scroll";
import { monthKey, monthLabel } from "@/lib/month-key";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Ministry Reports — Cross-Cultural Mission" },
      { name: "description", content: "Live feed of every ministry update submitted by Cross-Cultural Mission church planter pastors." },
      { property: "og:title", content: "Ministry Reports — Cross-Cultural Mission" },
      { property: "og:description", content: "Live feed of every ministry update submitted by Cross-Cultural Mission church planter pastors." },
      { property: "og:url", content: "https://cross-cultural-mission-ccm.lovable.app/reports" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
      { name: "twitter:title", content: "Ministry Reports — Cross-Cultural Mission" },
      { name: "twitter:description", content: "Live feed of every ministry update submitted by Cross-Cultural Mission church planter pastors." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cross-cultural-mission-ccm.lovable.app/reports" }],
  }),
  component: ReportsPage,
});

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

interface LiveUpdate {
  id: string;
  missionary_id: string;
  title: string;
  summary: string | null;
  body: string | null;
  image_url: string | null;
  report_date: string | null;
  created_at: string;
}

function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["ministry_updates"],
    queryFn: async (): Promise<LiveUpdate[]> => {
      const { data, error } = await supabase
        .from("ministry_updates")
        .select("id, missionary_id, title, summary, body, image_url, report_date, created_at")
        .order("report_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const grouped = useMemo(() => {
    const list = data ?? [];
    const map = new Map<string, { key: string; label: string; items: LiveUpdate[] }>();
    for (const u of list) {
      const dateSrc = u.report_date ?? u.created_at;
      const key = monthKey(dateSrc);
      const label = key === "0000-00" ? "Undated" : monthLabel(key);
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key)!.items.push(u);
    }
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [data]);

  useHashScroll(grouped.length);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Ministry Reports</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Live feed of ministry updates from every field — grouped by month, latest first.
          Updates in real-time as pastors post from their profiles.
        </p>
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
