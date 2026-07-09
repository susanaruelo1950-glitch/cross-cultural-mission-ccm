import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Users, ChevronLeft, ChevronRight, Wifi, WifiOff } from "lucide-react";
import { MissionaryCard } from "@/components/MissionaryCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDataStore } from "@/hooks/use-data-store";
import { useDirectory } from "@/hooks/use-directory";
import { useLowData } from "@/hooks/use-low-data";
import { ALL, useSharedFilters } from "@/hooks/use-shared-filters";
import { supabase } from "@/integrations/supabase/client";
import { createDisplayUrl } from "@/lib/storage-signed";

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


const PAGE_SIZE = 12;

function Directory() {
  const { q: qFromUrl } = Route.useSearch();
  const [q, setQ] = useState(qFromUrl ?? "");
  const { missionaries } = useDataStore();
  // Filters come from the database (regions/provinces/phases/areas seeded there);
  // falls back to in-memory seed data while queries load or if the DB is empty.
  const { phases, areas, regions, provinces, loading } = useDirectory();
  const [regionId, setRegionId] = useState<string>(ALL);
  const [provinceId, setProvinceId] = useState<string>(ALL);
  const [phaseId, setPhaseId] = useState<string>(ALL);
  const [areaId, setAreaId] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const { lowData, setLowData } = useLowData();
  const qc = useQueryClient();

  // Build an area lookup map keyed by area id — the same id lives on
  // missionary.areaId regardless of whether the source is DB or seed data.
  const areaById = useMemo(() => {
    const m = new Map<string, (typeof areas)[number]>();
    for (const a of areas) m.set(a.id, a);
    return m;
  }, [areas]);

  // Region/province matching supports both DB ids ("region-xii") and
  // seed-data display names ("SOCCSKSARGEN (Region XII)"), so filters
  // return correct counts on either backend.
  const regionName = regions.find((r) => r.id === regionId)?.name;
  const provinceName = provinces.find((p) => p.id === provinceId)?.name;

  const visibleProvinces = useMemo(
    () => (regionId === ALL ? provinces : provinces.filter((p) => p.region_id === regionId)),
    [provinces, regionId],
  );
  const visibleAreas = useMemo(() => {
    return areas.filter((a) => {
      if (phaseId !== ALL && a.phaseId !== phaseId) return false;
      if (regionId !== ALL && a.region !== regionId && a.region !== regionName) return false;
      if (provinceId !== ALL && a.province !== provinceId && a.province !== provinceName) return false;
      return true;
    });
  }, [areas, phaseId, regionId, regionName, provinceId, provinceName]);

  const filtered = useMemo(() => {
    return missionaries.filter((m) => {
      const area = areaById.get(m.areaId);
      if (phaseId !== ALL && area?.phaseId !== phaseId) return false;
      if (areaId !== ALL && m.areaId !== areaId) return false;
      if (
        regionId !== ALL &&
        area?.region !== regionId &&
        area?.region !== regionName
      )
        return false;
      if (
        provinceId !== ALL &&
        area?.province !== provinceId &&
        area?.province !== provinceName
      )
        return false;
      if (q.trim()) {
        const needle = q.toLowerCase();
        const hay = `${m.fullName} ${m.church} ${m.address} ${m.missionStatement}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [q, phaseId, areaId, regionId, provinceId, regionName, provinceName, missionaries, areaById]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(pageStart, pageStart + PAGE_SIZE);
  const nextPageItems = filtered.slice(pageStart + PAGE_SIZE, pageStart + PAGE_SIZE * 2);

  // Prefetch signed photo URLs for the next page so pagination feels instant.
  // Skip in low-data mode to keep bandwidth minimal.
  useEffect(() => {
    if (lowData || nextPageItems.length === 0) return;
    for (const m of nextPageItems) {
      qc.prefetchQuery({
        queryKey: ["missionary_photo", m.id],
        queryFn: async () => {
          const { data } = await supabase
            .from("missionary_photos")
            .select("photo_url")
            .eq("missionary_id", m.id)
            .maybeSingle();
          if (!data?.photo_url) return null;
          return createDisplayUrl("missionary-photos", data.photo_url);
        },
        staleTime: 30 * 60 * 1000,
      });
    }
  }, [nextPageItems, lowData, qc]);

  function resetFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Missionary Directory</h1>
          <p className="max-w-2xl text-muted-foreground">
            Meet every church planter pastor. Filter by region, province, phase, or area, or search by name or church.
          </p>
        </div>
        <Button
          variant={lowData ? "default" : "outline"}
          size="sm"
          className="rounded-full self-start sm:self-end"
          onClick={() => setLowData(!lowData)}
          aria-pressed={lowData}
          title="Defer photos and covers until each card scrolls into view"
        >
          {lowData ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
          {lowData ? "Low-data mode on" : "Low-data mode"}
        </Button>
      </header>

      <div className="card-soft grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative sm:col-span-2 lg:col-span-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by name, church, address..."
            className="pl-9"
          />
        </div>
        <Select
          value={regionId}
          onValueChange={(v) => {
            setRegionId(v);
            resetFilter(setProvinceId, ALL);
            resetFilter(setAreaId, ALL);
          }}
        >
          <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All regions</SelectItem>
            {regions.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select
          value={provinceId}
          onValueChange={(v) => {
            setProvinceId(v);
            resetFilter(setAreaId, ALL);
          }}
        >
          <SelectTrigger><SelectValue placeholder="Province" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All provinces</SelectItem>
            {visibleProvinces.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select
          value={phaseId}
          onValueChange={(v) => {
            setPhaseId(v);
            resetFilter(setAreaId, ALL);
          }}
        >
          <SelectTrigger><SelectValue placeholder="Phase" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All phases</SelectItem>
            {phases.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={areaId} onValueChange={(v) => resetFilter(setAreaId, v)}>
          <SelectTrigger className="sm:col-span-2 lg:col-span-3">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
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
      ) : loading && filtered.length === 0 ? (
        <DirectorySkeleton />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : pageStart + 1}
              –{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
              {filtered.length !== missionaries.length ? ` (filtered from ${missionaries.length})` : ""}
            </p>
            {totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageItems.map((m) => (
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

function DirectorySkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="card-soft overflow-hidden p-0">
          <Skeleton className="h-24 w-full rounded-none" />
          <div className="-mt-8 flex flex-col px-5 pb-5">
            <Skeleton className="h-16 w-16 rounded-full border-4 border-card" />
            <Skeleton className="mt-3 h-5 w-3/4" />
            <Skeleton className="mt-2 h-3.5 w-2/3" />
            <Skeleton className="mt-1 h-3.5 w-1/2" />
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
