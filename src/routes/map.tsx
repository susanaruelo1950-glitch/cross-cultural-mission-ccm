import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { missionaries } from "@/lib/mission-data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/map")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mission Map — Great Commission" },
      { name: "description", content: "Interactive map of every church planter, mission field, and prayer request." },
    ],
  }),
  component: MissionMap,
});

function MissionMap() {
  const [Leaflet, setLeaflet] = useState<null | typeof import("react-leaflet")>(null);
  const [L, setL] = useState<null | typeof import("leaflet")>(null);

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
      if (!mounted) return;
      setLeaflet(rl);
      setL(l);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!Leaflet || !L) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Mission Map</h1>
        <Card className="card-soft grid h-[70vh] place-items-center text-muted-foreground">
          Loading map...
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
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Mission Map</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every pin represents a church planter serving the Great Commission. Click one to see their story.
        </p>
      </header>
      <Card className="card-soft overflow-hidden p-0">
        <div className="h-[70vh] w-full">
          <MapContainer center={[12.8797, 121.774]} zoom={6} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {missionaries.map((m) => (
              <Marker key={m.id} position={m.gps} icon={icon}>
                <Popup>
                  <div style={{ width: 220 }}>
                    <img src={m.photo} alt={m.fullName} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }} />
                    <div style={{ marginTop: 8, fontWeight: 600 }}>{m.fullName}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{m.missionField}</div>
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      <strong>Prayer:</strong> {m.prayerRequests[0] ?? "—"}
                    </div>
                    <Link to="/missionaries/$id" params={{ id: m.id }} style={{ display: "inline-block", marginTop: 8, color: "oklch(0.45 0.14 245)", fontWeight: 500 }}>
                      View profile →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        {missionaries.map((m) => (
          <Badge key={m.id} variant="outline" className="rounded-full">
            📍 {m.municipality} — {m.fullName}
          </Badge>
        ))}
      </div>
    </div>
  );
}
