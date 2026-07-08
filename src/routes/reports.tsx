import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { missionaries, reports } from "@/lib/mission-data";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Ministry Reports — Great Commission" },
      { name: "description", content: "Latest field reports from every missionary." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const sorted = [...reports].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Ministry Reports</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Fresh updates from every field — salvations, baptisms, challenges, and praise.
        </p>
      </header>

      <div className="grid gap-5">
        {sorted.map((r) => {
          const m = missionaries.find((x) => x.id === r.missionaryId)!;
          return (
            <Card key={r.id} className="card-soft p-6">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={m.photo} alt={m.fullName} />
                  <AvatarFallback>{m.fullName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold">{r.title}</h3>
                  <Link to="/missionaries/$id" params={{ id: m.id }} className="text-sm text-primary hover:underline">
                    {m.fullName} · {m.missionField}
                  </Link>
                  <p className="mt-2 text-foreground/90">{r.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs">
                    <Stat label="Salvations" value={r.salvations} />
                    <Stat label="Baptisms" value={r.baptisms} />
                    <Stat label="Bible Studies" value={r.bibleStudies} />
                    <Stat label="Attendance" value={r.attendance} />
                    <Stat label="Leaders Trained" value={r.leadersTrained} />
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
        {sorted.length === 0 ? (
          <Card className="card-soft p-10 text-center text-muted-foreground">
            <FileText className="mx-auto mb-2 h-8 w-8" /> No reports yet.
          </Card>
        ) : null}
      </div>
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
