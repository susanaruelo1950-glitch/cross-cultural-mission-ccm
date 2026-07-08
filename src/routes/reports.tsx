import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { getMissionary, reports } from "@/lib/mission-data";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Ministry Reports — Great Commission" },
      { name: "description", content: "Latest field reports from every missionary." },
    ],
  }),
  component: ReportsPage,
});

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function ReportsPage() {
  const sorted = [...reports].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Ministry Reports</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Fresh updates from every field — salvations, baptisms, challenges, and praise.
        </p>
      </header>

      {sorted.length === 0 ? (
        <EmptyState icon={FileText} title="No reports yet" description="Reports will appear here once missionaries submit them." />
      ) : (
        <div className="grid gap-5">
          {sorted.map((r) => {
            const m = getMissionary(r.missionaryId);
            return (
              <Card key={r.id} className="card-soft p-6">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
                  {m ? (
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={m.photo} alt={m.fullName} />
                      <AvatarFallback className="bg-primary/10 text-primary">{initials(m.fullName)}</AvatarFallback>
                    </Avatar>
                  ) : <span />}
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold">{r.title}</h3>
                    {m ? (
                      <Link to="/missionaries/$id" params={{ id: m.id }} className="text-sm text-primary hover:underline">
                        {m.fullName} · {m.church}
                      </Link>
                    ) : null}
                    <p className="mt-2 text-foreground/90">{r.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      {r.salvations !== undefined ? <Stat label="Salvations" value={r.salvations} /> : null}
                      {r.baptisms !== undefined ? <Stat label="Baptisms" value={r.baptisms} /> : null}
                      {r.bibleStudies !== undefined ? <Stat label="Bible Studies" value={r.bibleStudies} /> : null}
                      {r.attendance !== undefined ? <Stat label="Attendance" value={r.attendance} /> : null}
                      {r.leadersTrained !== undefined ? <Stat label="Leaders" value={r.leadersTrained} /> : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">{r.date}</span>
                    <Button variant="outline" size="sm" className="rounded-full">
                      <Download className="h-4 w-4" /> PDF
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
      <span className="font-semibold text-primary">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
