import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HeartHandshake, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { getMissionary } from "@/lib/mission-data";
import { useMissionaryPhoto } from "@/hooks/use-missionary-photo";
import { PrayerRequestsPanel, type DbPrayer } from "@/components/PrayerRequestsPanel";

export const Route = createFileRoute("/prayer")({
  head: () => ({
    meta: [
      { title: "Prayer Center — Great Commission" },
      { name: "description", content: "Live prayer requests from missionaries in the field." },
    ],
  }),
  component: PrayerCenter,
});

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function PrayerCenter() {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["prayer_requests_db", "__all__"],
    queryFn: async (): Promise<DbPrayer[]> => {
      const { data, error } = await supabase
        .from("prayer_requests_db")
        .select("id, missionary_id, title, detail, urgent, answered, created_at")
        .order("urgent", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, DbPrayer[]>();
    for (const p of data ?? []) {
      const arr = map.get(p.missionary_id) ?? [];
      arr.push(p);
      map.set(p.missionary_id, arr);
    }
    // Filter by search
    const needle = q.trim().toLowerCase();
    return Array.from(map.entries())
      .filter(([mid, items]) => {
        if (!needle) return true;
        const m = getMissionary(mid);
        const hay = `${m?.fullName ?? ""} ${m?.church ?? ""} ${items.map((i) => i.title + " " + (i.detail ?? "")).join(" ")}`.toLowerCase();
        return hay.includes(needle);
      });
  }, [data, q]);

  const urgent = (data ?? []).filter((p) => p.urgent && !p.answered);
  const active = (data ?? []).filter((p) => !p.answered);
  const answered = (data ?? []).filter((p) => p.answered);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Prayer Center</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            "Pray earnestly to the Lord of the harvest to send out laborers into his harvest." — Matthew 9:38
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="card-soft p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Urgent</div>
          <div className="mt-1 font-display text-2xl font-semibold text-destructive">{urgent.length}</div>
        </Card>
        <Card className="card-soft p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Active</div>
          <div className="mt-1 font-display text-2xl font-semibold text-primary">{active.length}</div>
        </Card>
        <Card className="card-soft p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Answered</div>
          <div className="mt-1 font-display text-2xl font-semibold text-secondary">{answered.length}</div>
        </Card>
        <Card className="card-soft p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
          <div className="mt-1 font-display text-2xl font-semibold">{(data ?? []).length}</div>
        </Card>
      </div>

      <div className="card-soft p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by missionary, church, or request…"
            className="pl-9"
            aria-label="Search prayer requests"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Loading prayer requests…</p>
      ) : grouped.length === 0 ? (
        <Card className="card-soft p-10 text-center">
          <HeartHandshake className="mx-auto mb-3 h-10 w-10 text-primary" aria-hidden />
          <h2 className="font-display text-xl font-semibold">No prayer requests yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Admins and area coordinators can post prayer requests from a missionary's profile page.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([mid, items]) => (
            <MissionaryGroup key={mid} missionaryId={mid} count={items.length} />
          ))}
        </div>
      )}
    </div>
  );
}

function MissionaryGroup({ missionaryId, count }: { missionaryId: string; count: number }) {
  const m = getMissionary(missionaryId);
  const { data: override } = useMissionaryPhoto(missionaryId);
  const name = m?.fullName ?? "Missionary";
  const photo = override ?? m?.photo;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={photo} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary">{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {m ? (
            <Link
              to="/missionaries/$id"
              params={{ id: m.id }}
              className="font-display text-lg font-semibold hover:underline"
            >
              {name}
            </Link>
          ) : (
            <span className="font-display text-lg font-semibold">{name}</span>
          )}
          {m?.church ? <div className="text-xs text-muted-foreground">{m.church}</div> : null}
        </div>
        <Badge variant="secondary" className="rounded-full">{count}</Badge>
      </div>
      <PrayerRequestsPanel missionaryId={missionaryId} missionaryName={name} />
    </section>
  );
}
