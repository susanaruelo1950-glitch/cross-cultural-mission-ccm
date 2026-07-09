import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { MapIcon, List, ExternalLink, Locate } from "lucide-react";
import {
  allAreas,
  allMissionaries,
  allPhases,
  getArea,
  type Missionary,
} from "@/lib/mission-data";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSharedFilters, ALL } from "@/hooks/use-shared-filters";
import { toast } from "sonner";

export const Route = createFileRoute("/map")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mission Map — Cross-Cultural Mission" },
      { name: "description", content: "Interactive geographic map of every Cross-Cultural Mission field, area, and church planter." },
      { property: "og:title", content: "Mission Map — Cross-Cultural Mission" },
      { property: "og:description", content: "Interactive geographic map of every Cross-Cultural Mission field, area, and church planter." },
      { property: "og:url", content: "https://cross-cultural-mission-ccm.lovable.app/map" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
      { name: "twitter:title", content: "Mission Map — Cross-Cultural Mission" },
      { name: "twitter:description", content: "Interactive geographic map of every Cross-Cultural Mission field, area, and church planter." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cross-cultural-mission-ccm.lovable.app/map" }],
  }),
  component: MissionMap,
});

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0] ?? "").join("");
}

function MissionMap() {
  const [Leaflet, setLeaflet] = useState<null | typeof import("react-leaflet")>(null);
  const [L, setL] = useState<null | typeof import("leaflet")>(null);
  const [Cluster, setCluster] = useState<null | typeof import("leaflet.markercluster")>(null);
  const [phaseId, setPhaseId] = useState<string>("all");
  const [areaId, setAreaId] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
      import("leaflet.markercluster"),
      import("leaflet.markercluster/dist/MarkerCluster.css"),
      import("leaflet.markercluster/dist/MarkerCluster.Default.css"),
    ]).then(([rl, l, , mc]) => {
      if (!mounted) return;
      setLeaflet(rl);
      setL(l);
      setCluster(mc);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const phases = allPhases();
  const areas = allAreas();
  const missionaries = allMissionaries();

  const filteredAreas = useMemo(
    () => (phaseId === "all" ? areas : areas.filter((a) => a.phaseId === phaseId)),
    [phaseId, areas],
  );

  const { filters } = useSharedFilters();

  const filteredMissionaries = useMemo(
    () =>
      missionaries
        .filter((m) => (phaseId === "all" ? true : getArea(m.areaId)?.phaseId === phaseId))
        .filter((m) => (areaId === "all" ? true : m.areaId === areaId))
        .filter((m) => {
          if (filters.regionId === ALL) return true;
          const area = getArea(m.areaId);
          return (m.region ?? area?.region) === filters.regionId;
        })
        .filter((m) => {
          if (filters.provinceId === ALL) return true;
          const area = getArea(m.areaId);
          return (m.province ?? area?.province) === filters.provinceId;
        }),
    [missionaries, phaseId, areaId, filters.regionId, filters.provinceId],
  );

  const pinned = useMemo(
    () =>
      filteredMissionaries
        .map((m) => {
          const gps = m.gps ?? getArea(m.areaId)?.gps;
          return gps ? { ...m, gps } : null;
        })
        .filter((m): m is Missionary & { gps: [number, number] } => !!m),
    [filteredMissionaries],
  );
  // Defer heavy marker rebuilds so filter dropdowns stay snappy on low-end devices
  const deferredPinned = useDeferredValue(pinned);

  function locateMyPastors() {
    if (filters.phaseId !== ALL) setPhaseId(filters.phaseId);
    setAreaId("all");
    const scope = [
      filters.phaseId !== ALL ? phases.find((p) => p.id === filters.phaseId)?.name : null,
      filters.regionId !== ALL ? filters.regionId : null,
      filters.provinceId !== ALL ? filters.provinceId : null,
    ]
      .filter(Boolean)
      .join(" • ");
    toast.success(
      scope
        ? `Located ${pinned.length} pastor(s) in ${scope}.`
        : `Showing all ${pinned.length} pastor(s) — set a region/phase in the dashboard to narrow.`,
    );
  }

  const header = (
    <header className="flex flex-col gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Mission Map</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every pin is a church planter. Pins cluster together — tap a cluster to zoom in, or pick
          from the list.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={phaseId}
          onValueChange={(v) => {
            setPhaseId(v);
            setAreaId("all");
          }}
        >
          <SelectTrigger className="w-full rounded-full sm:w-56" aria-label="Filter by phase">
            <SelectValue placeholder="All phases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All phases</SelectItem>
            {phases.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={areaId} onValueChange={setAreaId}>
          <SelectTrigger className="w-full rounded-full sm:w-56" aria-label="Filter by area">
            <SelectValue placeholder="All areas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All areas</SelectItem>
            {filteredAreas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="rounded-full"
          onClick={locateMyPastors}
        >
          <Locate className="h-4 w-4" /> Locate my supported pastors
        </Button>
        <Badge variant="secondary" className="rounded-full">
          {pinned.length} {pinned.length === 1 ? "pin" : "pins"}
        </Badge>
      </div>
    </header>
  );

  if (!Leaflet || !L || !Cluster) {
    return (
      <div className="space-y-4">
        {header}
        <Card className="card-soft grid h-[60vh] place-items-center text-muted-foreground">
          Loading map…
        </Card>
      </div>
    );
  }

  const { MapContainer, TileLayer } = Leaflet;

  return (
    <div className="space-y-5">
      {header}
      {pinned.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title="No mapped locations for this filter"
          description="Try a different phase or area, or add a gps: [latitude, longitude] value to a missionary."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="card-soft overflow-hidden p-0">
            <div className="h-[55vh] w-full sm:h-[70vh]">
              <MapContainer
                center={[7.2, 124.9]}
                zoom={7}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
                zoomControl
                preferCanvas
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClusteredMarkers L={L} pinned={deferredPinned} />
              </MapContainer>
            </div>
          </Card>

          <Card className="card-soft flex flex-col p-0">
            <div className="flex items-center gap-2 border-b border-border/60 p-4">
              <List className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
                {areaId === "all" && phaseId === "all"
                  ? "All missionaries"
                  : "Selected list"}
              </h2>
            </div>
            <ul className="max-h-[65vh] overflow-y-auto divide-y divide-border/60">
              {pinned.map((m) => {
                const area = getArea(m.areaId);
                return (
                  <li key={m.id} className="p-3">
                    <a
                      href={`/missionaries/${m.id}`}
                      className="group flex items-center gap-3 rounded-lg p-1 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={m.photo} alt={m.fullName} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {initials(m.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{m.fullName}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {m.church}
                        </div>
                        {area ? (
                          <div className="truncate text-[11px] text-muted-foreground">
                            {area.name}
                          </div>
                        ) : null}
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

function ClusteredMarkers({
  L,
  pinned,
}: {
  L: typeof import("leaflet");
  pinned: (Missionary & { gps: [number, number] })[];
}) {
  const [useMapHook, setUseMapHook] = useState<null | typeof import("react-leaflet").useMap>(null);
  useEffect(() => {
    import("react-leaflet").then((rl) => setUseMapHook(() => rl.useMap));
  }, []);
  if (!useMapHook) return null;
  return <ClusteredInner L={L} pinned={pinned} useMap={useMapHook} />;
}

function ClusteredInner({
  L,
  pinned,
  useMap,
}: {
  L: typeof import("leaflet");
  pinned: (Missionary & { gps: [number, number] })[];
  useMap: typeof import("react-leaflet").useMap;
}) {
  const map = useMap();
  const groupRef = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    const icon = L.divIcon({
      className: "",
      html: `<div style="background:oklch(0.45 0.14 245);border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 4px 12px rgba(0,0,0,0.25)"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cluster = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 60,
      chunkedLoading: true,
      chunkInterval: 100,
      chunkDelay: 30,
      removeOutsideVisibleBounds: true,
      disableClusteringAtZoom: 14,
    });

    // Build markers off the main thread using requestIdleCallback so the map
    // paints tiles first on low-end mobile, then fills pins progressively.
    let cancelled = false;
    const batch: import("leaflet").Marker[] = [];
    for (const m of pinned) {
      const marker = L.marker(m.gps, { icon });
      const html = `
        <div style="width:220px">
          ${m.photo ? `<img src="${m.photo}" alt="${m.fullName}" loading="lazy" style="width:100%;height:110px;object-fit:cover;border-radius:8px" />` : ""}
          <div style="margin-top:8px;font-weight:600">${m.fullName}</div>
          <div style="font-size:12px;color:#666">${m.church ?? ""}</div>
          <a href="/missionaries/${m.id}" style="display:inline-block;margin-top:8px;color:oklch(0.45 0.14 245);font-weight:500">Open profile →</a>
        </div>`;
      marker.bindPopup(html);
      batch.push(marker);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));
    idle(() => {
      if (cancelled) return;
      cluster.addLayers(batch);
      map.addLayer(cluster);
      groupRef.current = cluster;
      if (pinned.length > 0) {
        const bounds = L.latLngBounds(pinned.map((p) => p.gps));
        map.fitBounds(bounds.pad(0.2), { maxZoom: 12, animate: true });
      }
    });

    return () => {
      cancelled = true;
      if (groupRef.current) map.removeLayer(groupRef.current);
      groupRef.current = null;
    };
  }, [L, map, pinned]);

  return null;
}
