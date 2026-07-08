import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef, type PointerEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  HeartHandshake,
  MapPin,
  Shuffle,
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

function PrayerMode() {
  const missionaries = useMemo(() => allMissionaries(), []);
  const [order, setOrder] = useState(() => missionaries.map((_, i) => i));
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);

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

  const next = () => setI((v) => (v + 1) % order.length);
  const prev = () => setI((v) => (v - 1 + order.length) % order.length);
  const shuffle = () => {
    const shuffled = [...order].sort(() => Math.random() - 0.5);
    setOrder(shuffled);
    setI(0);
  };

  function onPointerDown(e: PointerEvent) {
    startX.current = e.clientX;
  }
  function onPointerUp(e: PointerEvent) {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 60) (dx < 0 ? next : prev)();
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Prayer Mode</h1>
          <p className="mt-1 text-muted-foreground">
            Card {i + 1} of {order.length} · swipe or use arrows
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={shuffle} className="rounded-full">
          <Shuffle className="h-4 w-4" /> Shuffle
        </Button>
      </header>

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
                  No specific requests — please pray for wisdom, protection, and fruit in ministry.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {prayers.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-start gap-2 rounded-2xl bg-accent p-3"
                    >
                      <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-foreground/80">{p.detail}</div>
                      </div>
                    </li>
                  ))}
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
    </div>
  );
}
