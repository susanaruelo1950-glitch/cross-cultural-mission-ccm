import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "primary" | "secondary" | "warm" | "muted";
  /** Optional link target — when set, the card becomes an accessible link. */
  to?: string;
  /** Optional aria-label override when linked. */
  linkLabel?: string;
  /** Optional hash target on the destination route (e.g. "directory-list"). */
  hash?: string;

}

const tones = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/15 text-secondary",
  warm: "bg-warm text-warm-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function StatCard({ label, value, icon: Icon, hint, tone = "primary", to, linkLabel }: StatCardProps) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(t);
    }
  }, [value]);

  const inner = (
    <>
      <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", tones[tone])}>
        <Icon className={cn("h-5 w-5", flash && "animate-pulse")} />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 font-display text-2xl font-semibold text-foreground">{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </div>
    </>
  );

  const cardClasses = cn(
    "card-soft flex items-start gap-4 p-5 transition-all duration-500",
    flash && "ring-2 ring-primary/60 shadow-lift",
    to && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lift hover:ring-1 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  );

  if (to) {
    return (
      <Link to={to} aria-label={linkLabel ?? `View ${label}`} className="block rounded-2xl">
        <Card className={cardClasses} aria-live="polite">{inner}</Card>
      </Link>
    );
  }

  return (
    <Card className={cardClasses} aria-live="polite">
      {inner}
    </Card>
  );
}
