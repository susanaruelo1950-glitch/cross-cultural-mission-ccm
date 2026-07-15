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
import { NewsTicker } from "@/components/NewsTicker";
import { SharedFilterBar } from "@/components/SharedFilterBar";

import {
  missionStats,
  prayerRequests,
  reports,
} from "@/lib/mission-data";
import { useDataStore } from "@/hooks/use-data-store";
import { useDirectory } from "@/hooks/use-directory";
import { ALL, useSharedFilters } from "@/hooks/use-shared-filters";
import { useMinistryUpdateCount, usePrayerCount } from "@/hooks/use-live-counts";
import { useMinistryUpdatesList } from "@/hooks/use-ministry-updates";
import { useEffect, useMemo, useState } from "react";
import { PARTNER_OPTIONS, partnerIdFor } from "@/lib/partners";
import cbcpLogo from "@/assets/cbcp-logo.png.asset.json";
import igslLogo from "@/assets/igsl-logo.png.asset.json";
import fclLogo from "@/assets/fcl-logo.png.asset.json";

const PARTNERS = [
  { id: "cbcp", name: "Christian Bible Church of the Philippines", short: "CBCP", url: cbcpLogo.url },
  { id: "igsl", name: "International Graduate School of Leadership", short: "IGSL", url: igslLogo.url },
  { id: "fcl", name: "Foundations for Christian Leadership", short: "FCL", url: fclLogo.url },
];

const SOCIAL_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cross-Cultural Mission — Church Planting Dashboard" },
      {
        name: "description",
        content:
          "Live snapshot of church planter pastors, phases, areas, prayer requests, and ministry reports from Cross-Cultural Mission.",
      },
      { property: "og:title", content: "Cross-Cultural Mission — Church Planting Dashboard" },
      {
        property: "og:description",
        content:
          "Live snapshot of church planter pastors, phases, areas, prayer requests, and ministry reports from Cross-Cultural Mission.",
      },
      { property: "og:url", content: "https://cross-cultural-mission-ccm.lovable.app/" },
      { property: "og:image", content: SOCIAL_IMAGE },
      { name: "twitter:title", content: "Cross-Cultural Mission — Church Planting Dashboard" },
      { name: "twitter:description", content: "Live snapshot of church planter pastors, phases, areas, prayer requests, and ministry reports from Cross-Cultural Mission." },
      { name: "twitter:image", content: SOCIAL_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://cross-cultural-mission-ccm.lovable.app/" }],
  }),
  component: Dashboard,
});

const DASHBOARD_VERSES: { ref: string; text: string }[] = [
  { ref: "Matthew 28:19", text: "Therefore go and make disciples of all nations." },
  { ref: "Isaiah 6:8", text: "Here am I. Send me!" },
  { ref: "Acts 1:8", text: "You will be my witnesses… to the ends of the earth." },
  { ref: "Mark 16:15", text: "Go into all the world and preach the gospel to all creation." },
  { ref: "Psalm 96:3", text: "Declare his glory among the nations, his marvelous deeds among all peoples." },
  { ref: "Matthew 9:37-38", text: "The harvest is plentiful but the workers are few." },
  { ref: "Romans 10:15", text: "How beautiful are the feet of those who bring good news!" },
  { ref: "John 4:35", text: "Look at the fields! They are ripe for harvest." },
  { ref: "Luke 10:2", text: "Ask the Lord of the harvest to send out workers into his harvest field." },
  { ref: "Revelation 7:9", text: "A great multitude… from every nation, tribe, people and language." },
  { ref: "Habakkuk 2:14", text: "The earth will be filled with the knowledge of the glory of the LORD." },
  { ref: "Matthew 16:18", text: "I will build my church, and the gates of Hades will not overcome it." },
];

function Dashboard() {
  const { phases: seedPhasesData, areas: seedAreasData, missionaries } = useDataStore();
  const dir = useDirectory();
  // Prefer DB-backed directory so filter ids match the shared filter bar.
  const phases = dir.phases.length ? dir.phases : seedPhasesData;
  const areas = dir.areas.length ? dir.areas : seedAreasData;
  const { regions, provinces } = dir;
  const { filters, setFilters } = useSharedFilters();
  const regionName = regions.find((r) => r.id === filters.regionId)?.name;
  const provinceName = provinces.find((p) => p.id === filters.provinceId)?.name;

  const prayerLive = usePrayerCount();
  const updatesLive = useMinistryUpdateCount();
  const updatesList = useMinistryUpdatesList();
  // Prefer the list length so the badge and /reports can never diverge —
  // if the list is empty, the badge shows 0 (not a stale head count).
  const updatesCount = updatesList.data
    ? updatesList.data.length
    : (updatesLive.data ?? missionStats.totalReports);

  const areaMatches = (a: { region?: string; province?: string; phaseId: string }) => {
    if (filters.phaseId !== ALL && a.phaseId !== filters.phaseId) return false;
    if (filters.regionId !== ALL && a.region !== filters.regionId && a.region !== regionName) return false;
    if (filters.provinceId !== ALL && a.province !== filters.provinceId && a.province !== provinceName) return false;
    return true;
  };

  const filteredAreas = useMemo(() => areas.filter(areaMatches), [areas, filters, regionName, provinceName]);
  const areaIdSet = useMemo(() => new Set(filteredAreas.map((a) => a.id)), [filteredAreas]);
  const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
  const filteredMissionaries = useMemo(
    () =>
      missionaries.filter((m) => {
        if (!areaIdSet.has(m.areaId)) return false;
        if (filters.partnerId !== ALL && partnerIdFor(m) !== filters.partnerId) return false;
        return true;
      }),
    [missionaries, areaIdSet, filters.partnerId],
  );

  const areasByPhase = (id: string) => filteredAreas.filter((a) => a.phaseId === id);
  const missionariesByArea = (id: string) => filteredMissionaries.filter((m) => m.areaId === id);
  const byPhase = phases.map((p) => ({
    name: p.name,
    value: filteredMissionaries.filter((m) => areaById.get(m.areaId)?.phaseId === p.id).length,
  }));
  const maxPhase = Math.max(1, ...byPhase.map((b) => b.value));

  const filterActive =
    filters.regionId !== ALL ||
    filters.provinceId !== ALL ||
    filters.phaseId !== ALL ||
    filters.partnerId !== ALL;
  const urgentPrayer = prayerRequests.filter((p) => p.urgent && !p.answered);
  const recentReports = [...reports]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 4);

  // Rotating Scripture — cycles every 8s with a soft fade. Seeds from the day
  // so first paint feels intentional. Pauses on reduced-motion preference.
  const [verseIdx, setVerseIdx] = useState(() => new Date().getUTCDate() % DASHBOARD_VERSES.length);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setFading(true);
      window.setTimeout(() => {
        setVerseIdx((i) => (i + 1) % DASHBOARD_VERSES.length);
        setFading(false);
      }, 400);
    }, 8000);
    return () => window.clearInterval(id);
  }, []);
  const CURRENT_VERSE = DASHBOARD_VERSES[verseIdx];

  return (
    <div className="space-y-8">
      <h1 className="sr-only">Cross-Cultural Mission — Church Planting Dashboard</h1>

      {/* Rolling news / announcements banner (admin-managed via /admin) */}
      <NewsTicker />

      {/* Rotating Scripture & Mission Purpose — cycles through the verses that
          shape our sending. Fades gently every 8s; respects reduced motion. */}
      <section
        aria-label="Scripture and mission purpose"
        aria-live="polite"
        className="relative overflow-hidden rounded-3xl gradient-mission p-6 text-white shadow-lift sm:p-10"
      >
        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center">
          {/* Left: Scripture */}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Scripture &amp; Mission Purpose
            </div>
            <div className={`transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}>
              <blockquote className="mt-4 font-display text-2xl font-semibold italic leading-tight sm:text-4xl">
                &ldquo;{CURRENT_VERSE.text}&rdquo;
              </blockquote>
              <div className="mt-3 text-sm font-semibold uppercase tracking-widest text-white/80">
                — {CURRENT_VERSE.ref}
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-sm text-white/80 sm:text-base">
              Every people group. Every area. Every prayer — for the glory of Christ.
            </p>
          </div>

          {/* Right: Partners panel — logos live inside the hero to maximise space.
              Tap a logo to filter the dashboard by that sending partner. */}
          <aside
            aria-label="Our partners"
            className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md sm:p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-white/80">
                Our Partners in the Mission
              </h2>
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/60">Tap to filter</span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {PARTNERS.map((p) => {
                const active = filters.partnerId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFilters({ partnerId: active ? ALL : p.id })}
                    aria-pressed={active}
                    aria-label={`Filter dashboard by ${p.name}`}
                    title={p.name}
                    className={`group flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                      active
                        ? "border-white/70 bg-white/95 text-foreground shadow-lift"
                        : "border-white/20 bg-white/5 text-white hover:-translate-y-0.5 hover:border-white/50 hover:bg-white/15"
                    }`}
                  >
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full p-2 transition-colors ${active ? "bg-white" : "bg-white/90"}`}>
                      <img
                        src={p.url}
                        alt={`${p.name} logo`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className={`font-display text-xs font-semibold leading-tight ${active ? "text-foreground" : "text-white"}`}>
                      {p.short}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] leading-snug text-white/70">
              Partnering churches and schools sending laborers into the harvest.
            </p>
          </aside>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/5 blur-3xl" aria-hidden />
      </section>


      {/* Mission control — filter the entire dashboard by region, province, phase. */}
      <SharedFilterBar
        label="Mission focus"
        hint="Region · Province · Phase · Sending Partner — these filters follow you to the Missionary Directory and AI Assistant."
      />

      {/* Stat scoreboard — the current state of the harvest. */}
      <section aria-label="Mission statistics" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={filterActive ? "Missionaries (filtered)" : "Missionaries"} value={filterActive ? filteredMissionaries.length : missionStats.totalMissionaries} icon={Users} tone="primary" to="/missionaries" hash="directory-list" linkLabel="Jump to missionary directory list" />
        <StatCard label="Phases" value={missionStats.totalPhases} icon={Layers} tone="secondary" to="/phases" hash="phases-list" linkLabel="Jump to phases and areas" />
        <StatCard label={filterActive ? "Areas (filtered)" : "Areas"} value={filterActive ? filteredAreas.length : missionStats.totalAreas} icon={MapPin} tone="warm" to="/map" hash="mission-map" linkLabel="Jump to mission map" />
        <StatCard label="Churches" value={missionStats.totalChurches} icon={Church} tone="primary" to="/missionaries" hash="directory-list" linkLabel="Jump to church planters list" />
        <StatCard label="Prayer Requests" value={prayerLive.data ?? missionStats.totalPrayerRequests} icon={HeartHandshake} tone="secondary" to="/prayer" hash="prayer-list" linkLabel="Jump to prayer requests" />
        <StatCard label="Updates" value={updatesCount} icon={FileText} tone="warm" to="/reports" hash="reports-list" linkLabel="Jump to ministry updates" />
      </section>

      {/* Partners — CCM ministry partners. Touch-friendly grid on mobile,
          3-across on tablets and up. Tap a card to filter the dashboard by
          that sending partner. */}
      <section aria-label="Our partners" className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Our Partners</h2>
          <span className="text-xs font-medium text-secondary">Tap to filter</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PARTNERS.map((p) => {
            const active = filters.partnerId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setFilters({ partnerId: active ? ALL : p.id })}
                aria-pressed={active}
                aria-label={`Filter dashboard by ${p.name}`}
                className={`group flex min-h-[88px] w-full items-center gap-3 rounded-2xl border p-3 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:flex-col sm:items-center sm:justify-center sm:p-4 sm:text-center ${
                  active
                    ? "border-primary bg-primary/5 shadow-lift"
                    : "border-border/60 bg-card hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift"
                }`}
              >
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full p-2 transition-colors ${active ? "bg-primary/10" : "bg-muted group-hover:bg-primary/10"}`}>
                  <img
                    src={p.url}
                    alt={`${p.name} logo`}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-contain transition-all duration-300 ${active ? "" : "grayscale group-hover:grayscale-0"}`}
                  />
                </div>
                <div className="min-w-0 sm:mt-2">
                  <div className="font-display text-sm font-semibold leading-tight text-foreground">{p.short}</div>
                  <div className="line-clamp-2 text-[11px] text-muted-foreground">{p.name}</div>
                </div>
              </button>
            );
          })}
        </div>
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

      {/* Phases & Areas breakdown */}
      {phases.length > 0 ? (
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="card-soft p-6 lg:col-span-2">
            <h2 className="font-display text-xl font-semibold tracking-tight">Missionaries per Phase</h2>
            <p className="text-sm text-muted-foreground">How your team is distributed across the harvest phases.</p>
            <div className="mt-5 space-y-4">
              {byPhase.map((b, i) => (
                <div key={b.name}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-muted-foreground">{b.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={i === 1 ? "h-full rounded-full bg-secondary transition-all" : "h-full rounded-full bg-primary transition-all"}
                      style={{ width: `${(b.value / maxPhase) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="card-soft overflow-hidden p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight">Areas</h2>
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">By phase</span>
            </div>
            <p className="text-sm text-muted-foreground">Grouped and counted from the live directory.</p>
            <ul className="mt-4 space-y-4 text-sm">
              {phases.map((p) => (
                <li key={p.id} className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-accent/30 p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-display text-[0.78rem] font-bold uppercase tracking-[0.14em] text-primary">
                      {p.name}
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {areasByPhase(p.id).length}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {areasByPhase(p.id).map((a) => (
                      <li key={a.id} className="flex items-center justify-between rounded-lg px-1 py-0.5 hover:bg-accent/50">
                        <span className="font-medium text-foreground/90">{a.name}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {missionariesByArea(a.id).length}
                        </span>
                      </li>
                    ))}
                    {areasByPhase(p.id).length === 0 ? (
                      <li className="text-xs italic text-muted-foreground">No areas yet</li>
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

      {/* Activity feed */}
      {(recentReports.length > 0 || urgentPrayer.length > 0) ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="card-soft p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight">Latest Reports</h2>
              <Link to="/reports" className="text-sm font-medium text-primary hover:underline">View all</Link>
            </div>
            {recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentReports.map((r) => (
                  <li key={r.id} className="rounded-xl border border-border p-3 transition-colors hover:bg-accent/30">
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
              <h2 className="font-display text-xl font-semibold tracking-tight">Urgent Prayer</h2>
              <Link to="/prayer" className="text-sm font-medium text-primary hover:underline">Open Prayer Center</Link>
            </div>
            {urgentPrayer.length === 0 ? (
              <p className="text-sm text-muted-foreground">No urgent requests right now.</p>
            ) : (
              <ul className="space-y-3">
                {urgentPrayer.map((p) => (
                  <li key={p.id} className="rounded-xl border border-border p-3 transition-colors hover:bg-accent/30">
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
