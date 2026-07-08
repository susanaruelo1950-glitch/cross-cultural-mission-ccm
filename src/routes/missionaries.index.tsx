import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MissionaryCard } from "@/components/MissionaryCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { missionaries, phases, regions } from "@/lib/mission-data";

export const Route = createFileRoute("/missionaries/")({
  head: () => ({
    meta: [
      { title: "Missionary Directory — Great Commission" },
      {
        name: "description",
        content:
          "Browse every church planter pastor by region, ministry focus, and mission journey phase.",
      },
    ],
  }),
  component: Directory,
});

const ALL = "__all__";

function Directory() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<string>(ALL);
  const [phase, setPhase] = useState<string>(ALL);
  const [focus, setFocus] = useState<string>(ALL);

  const focusOptions = Array.from(new Set(missionaries.map((m) => m.ministryFocus)));

  const filtered = useMemo(() => {
    return missionaries.filter((m) => {
      if (region !== ALL && m.region !== region) return false;
      if (phase !== ALL && m.phase !== phase) return false;
      if (focus !== ALL && m.ministryFocus !== focus) return false;
      if (q.trim()) {
        const needle = q.toLowerCase();
        const hay = `${m.fullName} ${m.churchName} ${m.missionField} ${m.province} ${m.peopleGroup} ${m.ministryFocus}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [q, region, phase, focus]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Missionary Directory</h1>
        <p className="max-w-2xl text-muted-foreground">
          Meet the church planters. Filter by mission journey, region, or ministry focus.
        </p>
      </header>

      <div className="card-soft grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, church, people group..." className="pl-9" />
        </div>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All regions</SelectItem>
            {regions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={phase} onValueChange={setPhase}>
          <SelectTrigger><SelectValue placeholder="Mission Journey" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All phases</SelectItem>
            {phases.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={focus} onValueChange={setFocus}>
          <SelectTrigger><SelectValue placeholder="Ministry Focus" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All focuses</SelectItem>
            {focusOptions.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

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
    </div>
  );
}
