import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOURNEY_STAGES, type JourneyStage } from "@/lib/mission-data";

interface Props {
  current?: JourneyStage;
  className?: string;
}

/**
 * Visual mission-journey progression:
 * Candidate → Training → Internship → Commissioned → Church Planting
 * → Multiplication → Regional Leadership → Retired
 */
export function JourneyTimeline({ current = "Church Planting", className }: Props) {
  const idx = JOURNEY_STAGES.indexOf(current);
  return (
    <div className={cn("w-full", className)}>
      <ol className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8" aria-label="Mission journey">
        {JOURNEY_STAGES.map((stage, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={stage} className="flex flex-col items-center text-center">
              <div
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full text-xs font-semibold shadow-soft transition-colors",
                  done && "bg-secondary text-secondary-foreground",
                  active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </div>
              <div
                className={cn(
                  "mt-2 text-xs leading-tight",
                  active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {stage}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
