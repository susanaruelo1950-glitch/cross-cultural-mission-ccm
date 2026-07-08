import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Layers,
  MapPin,
  Church,
  HeartHandshake,
  FileText,
  Sparkles,
  ArrowRight,
  Building2,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import {
  missionariesByPhaseCount,
  missionStats,
  prayerRequests,
  reports,
} from "@/lib/mission-data";
import { useDataStore } from "@/hooks/use-data-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mission Dashboard — Great Commission" },
      {
        name: "description",
        content:
          "Live snapshot of church planter pastors, phases, areas, prayer requests, and ministry reports.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { phases, areas, missionaries } = useDataStore();
  const areasByPhase = (id: string) => areas.filter((a) => a.phaseId === id);
  const missionariesByArea = (id: string) => missionaries.filter((m) => m.areaId === id);
  const byPhase = missionariesByPhaseCount();
  const maxPhase = Math.max(1, ...byPhase.map((b) => b.value));
  const urgentPrayer = prayerRequests.filter((p) => p.urgent && !p.answered);
  const recentReports = [...reports]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl gradient-mission p-6 text-white shadow-lift sm:p-10">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Mission Snapshot
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-5xl">
            Every people group. Every area. Every prayer.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
            Track church planter pastors across every phase and area — for the glory of Christ.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary" className="rounded-full">
              <Link to="/missionaries">Browse missionaries <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="rounded-full bg-white/10 text-white hover:bg-white/20">
              <Link to="/phases">View phases & areas</Link>
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
      </section>

      {/* Stat grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Missionaries" value={missionStats.totalMissionaries} icon={Users} tone="primary" />
        <StatCard label="Phases" value={missionStats.totalPhases} icon={Layers} tone="secondary" />
        <StatCard label="Areas" value={missionStats.totalAreas} icon={MapPin} tone="warm" />
        <StatCard label="Churches" value={missionStats.totalChurches} icon={Church} tone="primary" />
        <StatCard label="Prayer Requests" value={missionStats.totalPrayerRequests} icon={HeartHandshake} tone="secondary" />
        <StatCard label="Reports" value={missionStats.totalReports} icon={FileText} tone="warm" />
      </section>

      {/* Empty state when nothing entered */}
      {missionaries.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No data yet"
          description="Start by defining your Phases and Areas, then add missionaries. Every dashboard, map, and report will fill in automatically."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild className="rounded-full"><Link to="/phases">Set up Phases & Areas</Link></Button>
              <Button asChild variant="outline" className="rounded-full"><Link to="/missionaries">Add missionaries</Link></Button>
            </div>
          }
        />
      ) : null}

      {/* Phases breakdown */}
      {phases.length > 0 ? (
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="card-soft p-6 lg:col-span-2">
            <h2 className="font-display text-xl font-semibold">Missionaries per Phase</h2>
            <p className="text-sm text-muted-foreground">How your team is distributed across the phases.</p>
            <div className="mt-5 space-y-4">
              {byPhase.map((b) => (
                <div key={b.name}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-muted-foreground">{b.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(b.value / maxPhase) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="card-soft p-6">
            <h2 className="font-display text-xl font-semibold">Areas</h2>
            <p className="text-sm text-muted-foreground">Grouped by phase.</p>
            <ul className="mt-4 space-y-3 text-sm">
              {phases.map((p) => (
                <li key={p.id}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.name}</div>
                  <ul className="mt-1 space-y-1">
                    {areasByPhase(p.id).map((a) => (
                      <li key={a.id} className="flex items-center justify-between">
                        <span>{a.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {missionariesByArea(a.id).length}
                        </span>
                      </li>
                    ))}
                    {areasByPhase(p.id).length === 0 ? (
                      <li className="text-xs text-muted-foreground">No areas yet</li>
                    ) : null}
                  </ul>
                </li>
              ))}
              {areas.length === 0 ? (
                <li className="text-xs text-muted-foreground">No areas yet</li>
              ) : null}
            </ul>
          </Card>
        </section>
      ) : null}

      {/* Activity */}
      {(recentReports.length > 0 || urgentPrayer.length > 0) ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="card-soft p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold">Latest Reports</h2>
              <Link to="/reports" className="text-sm font-medium text-primary hover:underline">View all</Link>
            </div>
            {recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentReports.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border p-3">
                    <div className="font-medium">{r.title}</div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{r.summary}</p>
                    <span className="text-xs text-muted-foreground">{r.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="card-soft p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold">Urgent Prayer</h2>
              <Link to="/prayer" className="text-sm font-medium text-primary hover:underline">Open Prayer Center</Link>
            </div>
            {urgentPrayer.length === 0 ? (
              <p className="text-sm text-muted-foreground">No urgent requests right now.</p>
            ) : (
              <ul className="space-y-3">
                {urgentPrayer.map((p) => (
                  <li key={p.id} className="rounded-xl border border-border p-3">
                    <div className="font-medium">{p.title}</div>
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{p.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
