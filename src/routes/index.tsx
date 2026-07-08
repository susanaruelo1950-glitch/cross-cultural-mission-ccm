import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Globe2,
  MapPin,
  Building2,
  Compass,
  Home,
  HeartHandshake,
  FileText,
  UserPlus,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  churchesByRegion,
  growthTimeline,
  missionaries,
  missionariesByPhase,
  missionariesByRegion,
  missionStats,
  reports,
  supportStatus,
} from "@/lib/mission-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mission Dashboard — Great Commission" },
      {
        name: "description",
        content:
          "Where are our missionaries, how are they doing, and what do they need? A live snapshot of the Great Commission.",
      },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = [
  "oklch(0.45 0.14 245)",
  "oklch(0.62 0.13 155)",
  "oklch(0.72 0.12 75)",
  "oklch(0.55 0.18 30)",
  "oklch(0.55 0.15 300)",
  "oklch(0.5 0.14 200)",
];

function Dashboard() {
  const byRegion = missionariesByRegion();
  const byPhase = missionariesByPhase();
  const churches = churchesByRegion();
  const support = supportStatus();
  const growth = growthTimeline();
  const recentReports = [...reports]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const newMissionaries = [...missionaries]
    .sort((a, b) => b.dateSent.localeCompare(a.dateSent))
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl gradient-mission p-8 text-white shadow-lift sm:p-12">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Mission Snapshot
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-5xl">
            Every people group. Every province. Every prayer.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
            Serving alongside {missionStats.totalMissionaries} church planter pastors across{" "}
            {missionStats.totalRegions} regions of the Philippines and beyond — for the glory of
            Christ.
          </p>
        </div>
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />
      </section>

      {/* Stat grid */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Church Planters" value={missionStats.totalMissionaries} icon={Users} tone="primary" />
        <StatCard label="Regions" value={missionStats.totalRegions} icon={Globe2} tone="secondary" />
        <StatCard label="Provinces" value={missionStats.totalProvinces} icon={MapPin} tone="warm" />
        <StatCard label="Churches Planted" value={missionStats.totalChurchesPlanted} icon={Building2} tone="primary" />
        <StatCard label="Active Mission Fields" value={missionStats.totalActiveFields} icon={Compass} tone="secondary" />
        <StatCard label="Missionary Families" value={missionStats.totalFamilies} icon={Home} tone="warm" />
        <StatCard label="Prayer Requests" value={missionStats.totalPrayerRequests} icon={HeartHandshake} tone="primary" />
        <StatCard label="Ministry Reports" value={missionStats.totalReports} icon={FileText} tone="secondary" />
        <StatCard label="Baptisms" value={missionStats.totalBaptisms} icon={UserPlus} tone="warm" />
        <StatCard label="People Reached" value={missionStats.totalPopulationReached.toLocaleString()} icon={Sparkles} tone="primary" />
      </section>

      {/* Charts */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="card-soft p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Mission Growth Timeline</h2>
              <p className="text-sm text-muted-foreground">Cumulative missionaries & churches planted</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth}>
                <CartesianGrid stroke="oklch(0.92 0.01 240)" vertical={false} />
                <XAxis dataKey="year" stroke="oklch(0.5 0.02 240)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.02 240)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 240)" }} />
                <Legend />
                <Line type="monotone" dataKey="missionaries" stroke={CHART_COLORS[0]} strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="churches" stroke={CHART_COLORS[1]} strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft p-5">
          <h2 className="font-display text-xl font-semibold">Missionaries by Phase</h2>
          <p className="text-sm text-muted-foreground">Journey from candidate to leadership</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byPhase} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                  {byPhase.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft p-5">
          <h2 className="font-display text-xl font-semibold">Missionaries by Region</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byRegion}>
                <CartesianGrid stroke="oklch(0.92 0.01 240)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.5 0.02 240)" fontSize={10} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="oklch(0.5 0.02 240)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft p-5">
          <h2 className="font-display text-xl font-semibold">Churches Planted per Region</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={churches}>
                <CartesianGrid stroke="oklch(0.92 0.01 240)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.5 0.02 240)" fontSize={10} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="oklch(0.5 0.02 240)" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="value" fill={CHART_COLORS[1]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="card-soft p-5">
          <h2 className="font-display text-xl font-semibold">Support Status</h2>
          <p className="text-sm text-muted-foreground">Monthly support received vs. needed</p>
          <div className="mt-4 space-y-4">
            {support.map((s) => (
              <div key={s.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.percent}%</span>
                </div>
                <Progress value={s.percent} className="h-2" />
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Recent activity */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="card-soft p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Latest Ministry Reports</h2>
              <p className="text-sm text-muted-foreground">Fresh from the field</p>
            </div>
            <Link to="/reports" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-3">
            {recentReports.map((r) => {
              const m = missionaries.find((x) => x.id === r.missionaryId)!;
              return (
                <li key={r.id}>
                  <Link
                    to="/missionaries/$id"
                    params={{ id: m.id }}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.photo} alt={m.fullName} />
                      <AvatarFallback>{m.fullName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.title}</div>
                      <div className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{r.summary}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{r.date}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="card-soft p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold">Newly Sent Missionaries</h2>
              <p className="text-sm text-muted-foreground">Recent commissionings</p>
            </div>
            <Link to="/missionaries" className="text-sm font-medium text-primary hover:underline">
              Directory
            </Link>
          </div>
          <ul className="space-y-3">
            {newMissionaries.map((m) => (
              <li key={m.id}>
                <Link
                  to="/missionaries/$id"
                  params={{ id: m.id }}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={m.photo} alt={m.fullName} />
                    <AvatarFallback>{m.fullName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{m.fullName}</div>
                    <div className="mt-0.5 truncate text-sm text-muted-foreground">
                      {m.missionField} · Sent {m.dateSent}
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-full bg-secondary/15 text-secondary">
                    {m.phase}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
