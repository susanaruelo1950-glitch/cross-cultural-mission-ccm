import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import type { Missionary } from "@/lib/mission-data";

export function MissionaryCard({ m }: { m: Missionary }) {
  return (
    <Link to="/missionaries/$id" params={{ id: m.id }} className="group block">
      <Card className="card-soft overflow-hidden p-0 transition-shadow hover:shadow-lift">
        <div
          className="h-28 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${m.cover})` }}
        />
        <div className="-mt-8 px-5 pb-5">
          <Avatar className="h-16 w-16 border-4 border-card shadow-soft">
            <AvatarImage src={m.photo} alt={m.fullName} loading="lazy" />
            <AvatarFallback>{m.fullName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="mt-3">
            <h3 className="font-display text-lg font-semibold leading-tight text-foreground">
              {m.fullName}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{m.currentAssignment}</p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {m.municipality}, {m.province}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary hover:bg-primary/15">
              {m.phase}
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {m.ministryFocus}
            </Badge>
          </div>
        </div>
      </Card>
    </Link>
  );
}
