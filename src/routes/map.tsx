import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MapIcon } from "lucide-react";
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

export const Route = createFileRoute("/map")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mission Map — Great Commission" },
      {
        name: "description",
        content:
          "Interactive Philippines map of every church planter — filter by phase and area, tap a pin to open their profile.",
      },
    ],
  }),
  component: MissionMap,
});

function MissionMap() {
  const [Leaflet, setLeaflet] = useState<null | typeof import("react-leaflet")>(null);
  const [L, setL] = useState<null | typeof import("leaflet")>(null);
  const [phaseId, setPhaseId] = useState<string>("all");
  const [areaId, setAreaId] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
      import("leaflet/dist/leaflet.css"),
    ]).then(([rl, l]) => {
      if (!mounted) return;
      setLeaflet(rl);
      setL(l);
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

  const pinned = useMemo(() => {
    return missionaries
      .map((m) => {
        const gps = m.gps ?? getArea(m.areaId)?.gps;
        return gps ? { ...m, gps } : null;
      })
      .filter((m): m is Missionary & { gps: [number, number] } => !!m)
      .filter((m) => (phaseId === "all" ? true : getArea(m.areaId)?.phaseId === phaseId))
      .filter((m) => (areaId === "all" ? true : m.areaId === areaId));
  }, [missionaries, phaseId, areaId]);

  const header = (
    <header className="flex flex-col gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Mission Map</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every pin is a church planter. Tap to open their profile.
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
        <Badge variant="secondary" className="rounded-full">
          {pinned.length} {pinned.length === 1 ? "pin" : "pins"}
        </Badge>
      </div>
    </header>
  );

  if (!Leaflet || !L) {
    return (
      <div className="space-y-4">
        {header}
        <Card className="card-soft grid h-[60vh] place-items-center text-muted-foreground">
          Loading map…
        </Card>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup } = Leaflet;

  const icon = L.divIcon({
    className: "",
    html: `<div style="background:oklch(0.45 0.14 245);border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 4px 12px rgba(0,0,0,0.25)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

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
        <Card className="card-soft overflow-hidden p-0">
          <div className="h-[60vh] w-full sm:h-[70vh]">
            <MapContainer
              center={[7.2, 124.9]}
              zoom={7}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {pinned.map((m) => {
                const area = getArea(m.areaId);
                return (
                  <Marker key={m.id} position={m.gps} icon={icon}>
                    <Popup>
                      <div style={{ width: 240 }}>
                        {m.photo ? (
                          <img
                            src={m.photo}
                            alt={m.fullName}
                            style={{
                              width: "100%",
                              height: 120,
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                        ) : null}
                        <div style={{ marginTop: 8, fontWeight: 600 }}>{m.fullName}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>{m.church}</div>
                        {area ? (
                          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                            {area.name}
                          </div>
                        ) : null}
                        <a
                          href={`/missionaries/${m.id}`}
                          style={{
                            display: "inline-block",
                            marginTop: 10,
                            color: "oklch(0.45 0.14 245)",
                            fontWeight: 500,
                          }}
                        >
                          Open profile →
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
