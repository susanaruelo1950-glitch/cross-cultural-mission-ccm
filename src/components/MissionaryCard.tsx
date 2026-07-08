import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Church, MapPin } from "lucide-react";
import type { Missionary } from "@/lib/mission-data";
import { getArea, getPhase } from "@/lib/mission-data";
import { useMissionaryPhoto } from "@/hooks/use-missionary-photo";
import { useInView, useLowData } from "@/hooks/use-low-data";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function MissionaryCard({ m }: { m: Missionary }) {
  const area = getArea(m.areaId);
  const phase = area ? getPhase(area.phaseId) : undefined;
  const { data: photoOverride } = useMissionaryPhoto(m.id);
  const photo = photoOverride ?? m.photo;

  return (
    <Link
      to="/missionaries/$id"
      params={{ id: m.id }}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl"
    >
      <Card className="card-soft flex h-full flex-col overflow-hidden p-0 transition-shadow hover:shadow-lift">
        <div className="relative h-24 w-full gradient-mission">
          {m.cover ? (
            <img
              src={m.cover}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
          ) : null}
        </div>
        <div className="-mt-8 flex flex-1 flex-col px-5 pb-5">
          <Avatar className="h-16 w-16 border-4 border-card shadow-soft">
            <AvatarImage
              src={photo}
              alt={m.fullName}
              loading="lazy"
              decoding="async"
            />
            <AvatarFallback className="bg-primary/10 text-primary">{initials(m.fullName)}</AvatarFallback>
          </Avatar>
          <div className="mt-3">
            <h3 className="font-display text-lg font-semibold leading-tight text-foreground">
              {m.fullName}
            </h3>
            {m.church ? (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <Church className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-1">{m.church}</span>
              </p>
            ) : null}
            {m.address ? (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-2">{m.address}</span>
              </p>
            ) : null}
          </div>
          {m.missionStatement ? (
            <p className="mt-3 line-clamp-3 text-sm italic text-foreground/80">
              "{m.missionStatement}"
            </p>
          ) : null}
          <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
            {phase ? (
              <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary hover:bg-primary/15">
                {phase.name}
              </Badge>
            ) : null}
            {area ? (
              <Badge variant="outline" className="rounded-full">
                {area.name}
              </Badge>
            ) : null}
            {m.ministryFocus ? (
              <Badge variant="outline" className="rounded-full">
                {m.ministryFocus}
              </Badge>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
