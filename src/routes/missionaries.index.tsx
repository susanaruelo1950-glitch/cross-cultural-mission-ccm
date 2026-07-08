import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { MissionaryCard } from "@/components/MissionaryCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getArea } from "@/lib/mission-data";
import { useDataStore } from "@/hooks/use-data-store";
import { useDirectory } from "@/hooks/use-directory";

export const Route = createFileRoute("/missionaries/")({
  head: () => ({
    meta: [
      { title: "Missionary Directory — Cross-Cultural Mission" },
      { name: "description", content: "Browse every Cross-Cultural Mission church planter pastor by phase, area, and ministry focus." },
      { property: "og:title", content: "Missionary Directory — Cross-Cultural Mission" },
      { property: "og:description", content: "Browse every Cross-Cultural Mission church planter pastor by phase, area, and ministry focus." },
      { property: "og:url", content: "https://cross-cultural-mission-ccm.lovable.app/missionaries" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
      { name: "twitter:title", content: "Missionary Directory — Cross-Cultural Mission" },
      { name: "twitter:description", content: "Browse every Cross-Cultural Mission church planter pastor by phase, area, and ministry focus." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cross-cultural-mission-ccm.lovable.app/missionaries" }],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  component: Directory,
});

const ALL = "__all__";

function Directory() {
  const { q: qFromUrl } = Route.useSearch();
  const [q, setQ] = useState(qFromUrl ?? "");
  const { missionaries } = useDataStore();
  // Filters come from the database (regions/provinces/phases/areas seeded there);
  // falls back to in-memory seed data while queries load or if the DB is empty.
  const { phases, areas } = useDirectory();
  const [phaseId, setPhaseId] = useState<string>(ALL);
  const [areaId, setAreaId] = useState<string>(ALL);

  const visibleAreas = phaseId === ALL ? areas : areas.filter((a) => a.phaseId === phaseId);

  const filtered = useMemo(() => {
    return missionaries.filter((m) => {
      const area = getArea(m.areaId);
      if (phaseId !== ALL && area?.phaseId !== phaseId) return false;
      if (areaId !== ALL && m.areaId !== areaId) return false;
      if (q.trim()) {
        const needle = q.toLowerCase();
        const hay = `${m.fullName} ${m.church} ${m.address} ${m.missionStatement}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [q, phaseId, areaId, missionaries]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Missionary Directory</h1>
        <p className="max-w-2xl text-muted-foreground">
          Meet every church planter pastor. Filter by phase, area, or search by name or church.
        </p>
      </header>

      <div className="card-soft grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, church, address..."
            className="pl-9"
          />
        </div>
        <Select value={phaseId} onValueChange={(v) => { setPhaseId(v); setAreaId(ALL); }}>
          <SelectTrigger><SelectValue placeholder="Phase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All phases</SelectItem>
            {phases.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={areaId} onValueChange={setAreaId}>
          <SelectTrigger><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All areas</SelectItem>
            {visibleAreas.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {missionaries.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No missionaries yet"
          description="Add missionaries in src/lib/mission-data.ts. Each entry links to an Area, which links to a Phase."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {missionaries.length} missionaries
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((m) => (
              <MissionaryCard key={m.id} m={m} />
            ))}
            {filtered.length === 0 ? (
              <div className="col-span-full py-20 text-center text-muted-foreground">
                No missionaries match your filters.
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
