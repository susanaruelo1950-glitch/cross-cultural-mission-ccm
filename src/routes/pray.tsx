import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, type PointerEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  HeartHandshake,
  MapPin,
  Shuffle,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  allMissionaries,
  getArea,
  getPhase,
  prayerByMissionary,
  reportsByMissionary,
} from "@/lib/mission-data";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";

export const Route = createFileRoute("/pray")({
  head: () => ({
    meta: [
      { title: "Prayer Mode — Great Commission" },
      {
        name: "description",
        content:
          "Swipe through missionaries one at a time to pray for their photo, latest update, and prayer requests.",
      },
    ],
  }),
  component: PrayerMode,
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const STATE_KEY = "gc.prayer.session.v1";

interface PersistedState {
  order: number[];
  i: number;
  paused: boolean;
  viewedPrayerIds: string[];
}

function loadState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function PrayerMode() {
  const missionaries = useMemo(() => allMissionaries(), []);
  const [hydrated, setHydrated] = useState(false);
  const [order, setOrder] = useState<number[]>(() => missionaries.map((_, i) => i));
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewedPrayerIds, setViewedPrayerIds] = useState<string[]>([]);
  const startX = useRef<number | null>(null);

  // Hydrate persisted session from localStorage
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      const validOrder = saved.order.filter((idx) => idx >= 0 && idx < missionaries.length);
      if (validOrder.length) setOrder(validOrder);
      if (typeof saved.i === "number") setI(Math.min(saved.i, validOrder.length - 1));
      setPaused(!!saved.paused);
      setViewedPrayerIds(saved.viewedPrayerIds ?? []);
    }
    setHydrated(true);
  }, [missionaries.length]);

  // Persist state changes
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const state: PersistedState = { order, i, paused, viewedPrayerIds };
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }, [order, i, paused, viewedPrayerIds, hydrated]);

  // Keyboard nav (arrows + space) — placed BEFORE any early return to keep hook order stable
  useEffect(() => {
    if (missionaries.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") setI((v) => (v + 1) % missionaries.length);
      else if (e.key === "ArrowLeft")
        setI((v) => (v - 1 + missionaries.length) % missionaries.length);
      else if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [missionaries.length]);


  if (missionaries.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="No missionaries to pray for yet"
        description="Add missionaries from the Manage screen to start a prayer session."
      />
    );
  }

  const idx = order[i % order.length];
  const m = missionaries[idx];
  const area = getArea(m.areaId);
  const phase = area ? getPhase(area.phaseId) : undefined;
  const latest = reportsByMissionary(m.id)[0];
  const prayers = prayerByMissionary(m.id);

  const markViewed = (id: string) =>
    setViewedPrayerIds((v) => (v.includes(id) ? v : [...v, id]));

  const next = () => {
    prayers.forEach((p) => markViewed(p.id));
    setI((v) => (v + 1) % order.length);
  };
  const prev = () => setI((v) => (v - 1 + order.length) % order.length);
  const shuffle = () => {
    const shuffled = [...order].sort(() => Math.random() - 0.5);
    setOrder(shuffled);
    setI(0);
  };
  const resetSession = () => {
    setOrder(missionaries.map((_, k) => k));
    setI(0);
    setPaused(false);
    setViewedPrayerIds([]);
    if (typeof window !== "undefined") window.localStorage.removeItem(STATE_KEY);
    toast.success("Prayer session reset.");
  };

  function onPointerDown(e: PointerEvent) {
    if (paused) return;
    startX.current = e.clientX;
  }
  function onPointerUp(e: PointerEvent) {
    if (paused || startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Prayer Mode</h1>
          <p className="mt-1 text-muted-foreground" aria-live="polite" aria-atomic="true">
            Praying for <strong>{m.fullName}</strong> — card {i + 1} of {order.length} ·{" "}
            {viewedPrayerIds.length} prayer request
            {viewedPrayerIds.length === 1 ? "" : "s"} viewed
            {paused ? " · paused" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={paused ? "default" : "outline"}
            size="sm"
            onClick={() => setPaused((p) => !p)}
            className="rounded-full"
          >
            {paused ? (
              <>
                <Play className="h-4 w-4" /> Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" /> Pause
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={shuffle} className="rounded-full">
            <Shuffle className="h-4 w-4" /> Shuffle
          </Button>
          <Button variant="ghost" size="sm" onClick={resetSession} className="rounded-full">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </header>

      {paused ? (
        <Card className="card-soft p-6 text-center">
          <Pause className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <h2 className="font-display text-xl font-semibold">Session paused</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your current missionary, swipe position, and viewed prayer requests are saved. Tap
            Resume to continue where you left off.
          </p>
          <Button onClick={() => setPaused(false)} className="mt-4 rounded-full">
            <Play className="h-4 w-4" /> Resume prayer session
          </Button>
        </Card>
      ) : (
        <div
          className="relative select-none touch-pan-y"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <Card className="card-soft overflow-hidden">
            <div
              className="h-40 gradient-mission bg-cover bg-center sm:h-56"
              style={m.cover ? { backgroundImage: `url(${m.cover})` } : undefined}
            />
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 p-5 sm:p-7">
              <Avatar className="-mt-14 h-24 w-24 border-4 border-card shadow-lift sm:h-28 sm:w-28">
                <AvatarImage src={m.photo} alt={m.fullName} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {initials(m.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 self-end">
                <h2 className="font-display text-2xl font-semibold">{m.fullName}</h2>
                <p className="text-muted-foreground">{m.church}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {phase ? (
                    <Badge className="rounded-full bg-primary text-primary-foreground hover:bg-primary">
                      {phase.name}
                    </Badge>
                  ) : null}
                  {area ? (
                    <Badge variant="secondary" className="rounded-full">
                      {area.name}
                    </Badge>
                  ) : null}
                  {m.address ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {m.address}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-5 px-5 pb-6 sm:grid-cols-2 sm:px-7">
              <section>
                <h3 className="font-display text-lg font-semibold">Mission Statement</h3>
                <p className="mt-1 italic text-foreground/90">
                  {m.missionStatement || (
                    <span className="not-italic text-muted-foreground">Not provided yet.</span>
                  )}
                </p>
              </section>
              <section>
                <h3 className="font-display text-lg font-semibold">Latest Update</h3>
                {latest ? (
                  <>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {latest.date}
                    </div>
                    <div className="font-medium">{latest.title}</div>
                    <p className="text-sm text-foreground/90">{latest.summary}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No update posted yet.</p>
                )}
              </section>
              <section className="sm:col-span-2">
                <h3 className="font-display text-lg font-semibold">Prayer Requests</h3>
                {prayers.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    No specific requests — please pray for wisdom, protection, and fruit in
                    ministry.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm">
                    {prayers.map((p) => {
                      const seen = viewedPrayerIds.includes(p.id);
                      return (
                        <li
                          key={p.id}
                          className={`flex items-start gap-2 rounded-2xl p-3 transition-colors ${seen ? "bg-secondary/20" : "bg-accent"}`}
                          onClick={() => markViewed(p.id)}
                        >
                          {seen ? (
                            <CheckCircle2
                              className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
                              aria-hidden
                            />
                          ) : (
                            <Heart
                              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                              aria-hidden
                            />
                          )}
                          <div>
                            <div className="font-medium">{p.title}</div>
                            <div className="text-foreground/80">{p.detail}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 p-4">
              <Button variant="ghost" onClick={prev} aria-label="Previous missionary">
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/missionaries/$id" params={{ id: m.id }}>
                  <HeartHandshake className="h-4 w-4" /> Open profile
                </Link>
              </Button>
              <Button onClick={next} className="rounded-full" aria-label="Next missionary">
                Prayed — Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
