import { createFileRoute, useNavigate, useSearch, useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { MapIcon, List, ExternalLink, Locate, Search, Download, Share2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  getArea,
  type Missionary,
} from "@/lib/mission-data";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSharedFilters, ALL } from "@/hooks/use-shared-filters";
import { useDataStore } from "@/hooks/use-data-store";
import { useMapOfflineCache, writeMapCache, type MapPin } from "@/hooks/use-map-offline-cache";
import { toast } from "sonner";
import { z } from "zod";

const mapSearchSchema = z.object({
  focus: z.string().optional(),
  phase: z.string().optional(),
  area: z.string().optional(),
  region: z.string().optional(),
  province: z.string().optional(),
});

export const Route = createFileRoute("/map")({
  ssr: false,
  validateSearch: mapSearchSchema,
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

function MiniAvatar({ name, src, size = "md" }: { name: string; src?: string; size?: "sm" | "md" }) {
  const className = size === "sm" ? "h-7 w-7 text-[10px]" : "h-10 w-10 text-xs";
  return (
    <div className={`${className} grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 font-medium text-primary`}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" loading="lazy" /> : initials(name)}
    </div>
  );
}

function MissionMap() {
  const search = useSearch({ from: "/map" });
  const navigate = useNavigate({ from: "/map" });
  const routeHash = useLocation({ select: (l) => l.hash });
  const { filters, setFilters } = useSharedFilters();

  const [Leaflet, setLeaflet] = useState<null | typeof import("react-leaflet")>(null);
  const [L, setL] = useState<null | typeof import("leaflet")>(null);
  const [Cluster, setCluster] = useState<null | typeof import("leaflet.markercluster")>(null);
  const [phaseId, setPhaseId] = useState<string>(search.phase ?? "all");
  const [areaId, setAreaId] = useState<string>(search.area ?? "all");
  const [query, setQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(search.focus ?? null);
  const [markersReady, setMarkersReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);
  const handleMarkersReady = useCallback(() => setMarkersReady(true), []);
  const handleMarkersStart = useCallback(() => setMarkersReady(false), []);

  const listboxId = useId();
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Sync incoming URL filters into shared filter store once on mount.
  useEffect(() => {
    const patch: Partial<{ regionId: string; provinceId: string; phaseId: string }> = {};
    if (search.region) patch.regionId = search.region;
    if (search.province) patch.provinceId = search.province;
    if (search.phase) patch.phaseId = search.phase;
    if (Object.keys(patch).length) setFilters(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Order matters: leaflet.markercluster expects a global `L`.
      // Load leaflet first, expose it on window, THEN load the plugin.
      const [rl, l] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
        import("leaflet/dist/leaflet.css"),
      ]);
      const leafletNs = (l as unknown as { default?: unknown }).default ?? l;
      (window as unknown as { L: unknown }).L = leafletNs;
      const [mc] = await Promise.all([
        import("leaflet.markercluster"),
        import("leaflet.markercluster/dist/MarkerCluster.css"),
        import("leaflet.markercluster/dist/MarkerCluster.Default.css"),
      ]);
      if (!mounted) return;
      setLeaflet(rl);
      // Store the same object markercluster patched (window.L), not the ESM namespace wrapper.
      setL(leafletNs as typeof import("leaflet"));
      setCluster(mc);
      setCluster(mc);
    })().catch((err) => {
      console.error("Map libs failed to load", err);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const { phases, areas, missionaries } = useDataStore();

  const filteredAreas = useMemo(
    () => (phaseId === "all" ? areas : areas.filter((a) => a.phaseId === phaseId)),
    [phaseId, areas],
  );




  // Full pool of missionaries with GPS — cached offline for instant open + daily refresh.
  const allPinsLive = useMemo<MapPin[]>(
    () =>
      missionaries
        .map((m) => {
          const gps = m.gps ?? getArea(m.areaId)?.gps;
          return gps ? ({ ...m, gps } as MapPin) : null;
        })
        .filter((m): m is MapPin => !!m),
    [missionaries],
  );
  const cache = useMapOfflineCache(allPinsLive);
  const allPins = cache.pins;

  const pinned = useMemo(
    () =>
      allPins.filter((m) => {
        if (phaseId !== "all" && getArea(m.areaId)?.phaseId !== phaseId) return false;
        if (areaId !== "all" && m.areaId !== areaId) return false;
        if (filters.regionId !== ALL) {
          const area = getArea(m.areaId);
          if ((m.region ?? area?.region) !== filters.regionId) return false;
        }
        if (filters.provinceId !== ALL) {
          const area = getArea(m.areaId);
          if ((m.province ?? area?.province) !== filters.provinceId) return false;
        }
        return true;
      }),
    [allPins, phaseId, areaId, filters.regionId, filters.provinceId],
  );

  const q = query.trim().toLowerCase();
  const visiblePinned = useMemo(() => {
    if (!q) return pinned;
    return pinned.filter((m) =>
      [m.fullName, m.church, m.address].filter(Boolean).some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [pinned, q]);
  const searchSuggestions = useMemo(() => (q ? visiblePinned.slice(0, 8) : []), [visiblePinned, q]);

  // Keep the URL in sync so the current view is a shareable deep link.
  // Skip the first run so we don't clobber the incoming hash (e.g. #mission-map).
  const didSyncOnce = useRef(false);
  useEffect(() => {
    if (!didSyncOnce.current) {
      didSyncOnce.current = true;
      return;
    }
    navigate({
      search: {
        focus: focusId ?? undefined,
        phase: phaseId !== "all" ? phaseId : undefined,
        area: areaId !== "all" ? areaId : undefined,
        region: filters.regionId !== ALL ? filters.regionId : undefined,
        province: filters.provinceId !== ALL ? filters.provinceId : undefined,
      },
      hash: routeHash || undefined,
      replace: true,
    });
  }, [focusId, phaseId, areaId, filters.regionId, filters.provinceId, routeHash, navigate]);

  function pickSuggestion(m: Missionary) {
    setFocusId(m.id);
    setQuery(m.fullName);
    setOpen(false);
    setActiveIdx(-1);
  }

  async function copyDeepLink(id: string, name?: string) {
    try {
      const params = new URLSearchParams();
      params.set("focus", id);
      if (phaseId !== "all") params.set("phase", phaseId);
      if (areaId !== "all") params.set("area", areaId);
      if (filters.regionId !== ALL) params.set("region", filters.regionId);
      if (filters.provinceId !== ALL) params.set("province", filters.provinceId);
      const url = `${window.location.origin}/map?${params.toString()}`;
      await navigator.clipboard.writeText(url);
      toast.success(name ? `Link to ${name} copied` : "Map link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (query) setQuery("");
      setOpen(false);
      setActiveIdx(-1);
      e.currentTarget.blur();
      return;
    }
    if (!searchSuggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => (i + 1) % searchSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => (i <= 0 ? searchSuggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = searchSuggestions[activeIdx >= 0 ? activeIdx : 0];
      if (pick) pickSuggestion(pick);
    } else if (e.key === "Home") {
      setActiveIdx(0);
    } else if (e.key === "End") {
      setActiveIdx(searchSuggestions.length - 1);
    }
  }

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

  async function downloadMapData() {
    if (downloadPct !== null) return;
    try {
      setDownloadPct(0);
      const payload = {
        exportedAt: new Date().toISOString(),
        source: "cross-cultural-mission-ccm",
        version: 1,
        count: allPins.length,
        pins: allPins.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          church: m.church,
          address: m.address,
          areaId: m.areaId,
          region: m.region,
          province: m.province,
          gps: m.gps,
          photo: m.photo,
        })),
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });

      // Write to cache immediately so "offline" is guaranteed post-download.
      writeMapCache(allPins);

      // Simulate progress via FileReader for user feedback on large payloads.
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable) setDownloadPct(Math.round((e.loaded / e.total) * 100));
        };
        reader.onload = () => {
          setDownloadPct(100);
          resolve();
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mission-map-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${allPins.length} pins for offline use.`);
    } catch (err) {
      console.error("Map download failed", err);
      toast.error("Download failed. Please try again.");
    } finally {
      window.setTimeout(() => setDownloadPct(null), 1200);
    }
  }

  const activeOptionId =
    activeIdx >= 0 && searchSuggestions[activeIdx]
      ? `${listboxId}-opt-${searchSuggestions[activeIdx].id}`
      : undefined;

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
        <select
          value={phaseId}
          onChange={(e) => {
            setPhaseId(e.target.value);
            setAreaId("all");
          }}
          className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
          aria-label="Filter by phase"
        >
          <option value="all">All phases</option>
          {phases.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
          aria-label="Filter by area"
        >
          <option value="all">All areas</option>
          {filteredAreas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
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
          {visiblePinned.length} {visiblePinned.length === 1 ? "pin" : "pins"}
        </Badge>
        {cache.ts ? (
          <Badge variant="outline" className="rounded-full text-[11px] font-normal text-muted-foreground" title="Offline snapshot — refreshes daily">
            Offline · synced {formatSyncedAgo(cache.ts)}
          </Badge>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={downloadMapData}
          disabled={downloadPct !== null || allPins.length === 0}
          aria-label="Download latest mission map data for offline use"
        >
          <Download className="h-4 w-4" />
          {downloadPct === null ? "Download offline data" : downloadPct < 100 ? `Preparing… ${downloadPct}%` : "Saving…"}
        </Button>
      </div>
      {downloadPct !== null ? (
        <div className="w-full sm:max-w-md" aria-live="polite">
          <Progress value={downloadPct} className="h-1.5" />
          <div className="mt-1 text-[11px] text-muted-foreground">
            {downloadPct < 100 ? `Packaging ${allPins.length} pins… ${downloadPct}%` : "Saving to your device…"}
          </div>
        </div>
      ) : null}

      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          role="combobox"
          aria-expanded={open && searchSuggestions.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onSearchKeyDown}
          placeholder="Search a pastor by name, church, or address…"
          className="rounded-full pl-9"
          aria-label="Search pastors on the map"
        />
        {open && searchSuggestions.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Pastor search results"
            className="absolute z-[500] mt-1 max-h-72 w-full overflow-y-auto rounded-2xl border border-border/60 bg-popover shadow-lg"
          >
            {searchSuggestions.map((m, i) => {
              const optId = `${listboxId}-opt-${m.id}`;
              const active = i === activeIdx;
              return (
                <li
                  key={m.id}
                  id={optId}
                  role="option"
                  aria-selected={active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickSuggestion(m);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm ${
                    active ? "bg-accent" : ""
                  }`}
                >
                  <MiniAvatar name={m.fullName} src={m.photo} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{m.fullName}</div>
                    <div className="truncate text-xs text-muted-foreground">{m.church}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="sr-only" aria-live="polite">
          {q ? `${searchSuggestions.length} result${searchSuggestions.length === 1 ? "" : "s"}` : ""}
        </div>
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
      {visiblePinned.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title={query ? `No pastors match "${query}"` : "No mapped locations for this filter"}
          description={query ? "Try a different name, church, or clear the search." : "Try a different phase or area, or add GPS coordinates to a missionary."}
        />
      ) : (
        <div id="mission-map" data-section-anchor className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="card-soft overflow-hidden p-0">
            <div className="relative h-[55vh] w-full sm:h-[70vh]">
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
                <InvalidateSizeOnMount />
                <ClusteredMarkers
                  L={L}
                  pinned={visiblePinned}
                  focusId={focusId}
                  onReady={handleMarkersReady}
                  onStart={handleMarkersStart}
                  navigate={navigate}
                />

              </MapContainer>
              {!markersReady ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] flex items-center justify-center bg-background/70 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
                    Loading {visiblePinned.length.toLocaleString()} pastor pin{visiblePinned.length === 1 ? "" : "s"}…
                  </span>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="card-soft flex flex-col p-0">
            <div className="flex items-center gap-2 border-b border-border/60 p-4">
              <List className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
                {query ? `Matches (${visiblePinned.length})` : areaId === "all" && phaseId === "all" ? "All missionaries" : "Selected list"}
              </h2>
            </div>
            <ul className="max-h-[65vh] overflow-y-auto divide-y divide-border/60">
              {visiblePinned.map((m) => {
                const area = getArea(m.areaId);
                return (
                  <li key={m.id} className="p-3">
                    <button
                      type="button"
                      onClick={() => setFocusId(m.id)}
                      className="group flex w-full items-center gap-3 rounded-lg p-1 text-left hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <MiniAvatar name={m.fullName} src={m.photo} />
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
                    </button>
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

/**
 * Fixes the common "map appears grey / doesn't render until I resize" bug by
 * calling map.invalidateSize() after mount and on window resize.
 */
function InvalidateSizeOnMount() {
  const [useMapHook, setUseMapHook] = useState<null | typeof import("react-leaflet").useMap>(null);
  useEffect(() => {
    import("react-leaflet").then((rl) => setUseMapHook(() => rl.useMap));
  }, []);
  if (!useMapHook) return null;
  return <InvalidateSizeInner useMap={useMapHook} />;
}

function InvalidateSizeInner({ useMap }: { useMap: typeof import("react-leaflet").useMap }) {
  const map = useMap();
  useEffect(() => {
    const kick = () => map.invalidateSize();
    const t1 = window.setTimeout(kick, 0);
    const t2 = window.setTimeout(kick, 250);
    const t3 = window.setTimeout(kick, 800);
    window.addEventListener("resize", kick);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener("resize", kick);
    };
  }, [map]);
  return null;
}


function ClusteredMarkers({
  L,
  pinned,
  focusId,
  onReady,
  onStart,
  navigate,
}: {
  L: typeof import("leaflet");
  pinned: (Missionary & { gps: [number, number] })[];
  focusId: string | null;
  onReady: () => void;
  onStart: () => void;
  navigate: (opts: { to: string; params?: Record<string, string> }) => void;
}) {
  const [useMapHook, setUseMapHook] = useState<null | typeof import("react-leaflet").useMap>(null);
  useEffect(() => {
    import("react-leaflet").then((rl) => setUseMapHook(() => rl.useMap));
  }, []);
  if (!useMapHook) return null;
  return <ClusteredInner L={L} pinned={pinned} useMap={useMapHook} focusId={focusId} onReady={onReady} onStart={onStart} navigate={navigate} />;
}

function ClusteredInner({
  L,
  pinned,
  useMap,
  focusId,
  onReady,
  onStart,
  navigate,
}: {
  L: typeof import("leaflet");
  pinned: (Missionary & { gps: [number, number] })[];
  useMap: typeof import("react-leaflet").useMap;
  focusId: string | null;
  onReady: () => void;
  onStart: () => void;
  navigate: (opts: { to: string; params?: Record<string, string> }) => void;
}) {
  const map = useMap();
  const groupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const didFitRef = useRef(false);

  useEffect(() => {
    onStart();
    const icon = L.divIcon({
      className: "",
      html: `<div style="background:oklch(0.45 0.14 245);border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 4px 12px rgba(0,0,0,0.25)"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    const large = pinned.length > 300;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // markercluster monkey-patches the global L, which may not be the same
    // object identity as the ESM namespace we captured — always read from window.L.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const GL = (window as any).L ?? L;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cluster = (GL as any).markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: large ? 90 : 60,
      chunkedLoading: true,
      chunkInterval: large ? 60 : 100,
      chunkDelay: large ? 15 : 30,
      removeOutsideVisibleBounds: true,
      disableClusteringAtZoom: 14,
      animate: false,
      animateAddingMarkers: false,
    });

    const batch: import("leaflet").Marker[] = [];
    const localMap = new Map<string, import("leaflet").Marker>();
    for (const m of pinned) {
      const marker = L.marker(m.gps, { icon });
      // Whole popup card is a client-side link to the missionary profile.
      marker.bindPopup(() => {
        return `
          <a data-nav-id="${m.id}" href="/missionaries/${m.id}" style="display:block;width:220px;text-decoration:none;color:inherit;cursor:pointer">
            ${m.photo ? `<img src="${m.photo}" alt="${m.fullName}" loading="lazy" style="width:100%;height:110px;object-fit:cover;border-radius:8px" />` : ""}
            <div style="margin-top:8px;font-weight:600">${escapeHtml(m.fullName)}</div>
            <div style="font-size:12px;color:#666">${escapeHtml(m.church ?? "")}</div>
            <div style="margin-top:6px;font-size:12px;color:oklch(0.45 0.14 245);font-weight:500">Open profile →</div>
          </a>`;
      });
      // Double-click on a pin jumps straight to the profile without needing the popup.
      marker.on("dblclick", () => {
        navigate({ to: "/missionaries/$id", params: { id: m.id } });
      });
      batch.push(marker);
      localMap.set(m.id, marker);
    }


    // Add synchronously so pins appear immediately without a scheduler delay.
    cluster.addLayers(batch);
    map.addLayer(cluster);
    groupRef.current = cluster;
    markerMapRef.current = localMap;

    // Intercept popup link clicks so profiles open via the client router
    // (no full page reload).
    const onPopupOpen = (ev: { popup: import("leaflet").Popup }) => {
      const el = ev.popup.getElement();
      if (!el) return;
      const link = el.querySelector<HTMLAnchorElement>("a[data-nav-id]");
      if (!link) return;
      link.onclick = (e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        const id = link.getAttribute("data-nav-id");
        if (id) navigate({ to: "/missionaries/$id", params: { id } });
      };
    };
    map.on("popupopen", onPopupOpen);


    if (pinned.length > 0 && !didFitRef.current && !focusId) {
      const bounds = L.latLngBounds(pinned.map((p) => p.gps));
      map.fitBounds(bounds.pad(0.2), { maxZoom: 12, animate: false });
      didFitRef.current = true;
    }
    onReady();

    return () => {
      map.off("popupopen", onPopupOpen);
      if (groupRef.current) map.removeLayer(groupRef.current);
      groupRef.current = null;
      markerMapRef.current = new Map();
    };
    // focusId is intentionally excluded — the sibling effect below handles focus
    // without rebuilding every marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, map, pinned, onReady, onStart, navigate]);

  useEffect(() => {
    if (!focusId) return;
    const marker = markerMapRef.current.get(focusId);
    const group = groupRef.current;
    if (!marker || !group) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cluster = group as any;
    const latlng = marker.getLatLng();
    map.flyTo(latlng, Math.max(map.getZoom(), 13), { duration: 0.6 });
    if (typeof cluster.zoomToShowLayer === "function") {
      cluster.zoomToShowLayer(marker, () => marker.openPopup());
    } else {
      marker.openPopup();
    }
  }, [focusId, map]);

  return null;
}

function formatSyncedAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
