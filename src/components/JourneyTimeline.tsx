import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOURNEY_STAGES, type JourneyStage } from "@/lib/mission-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Props {
  current?: JourneyStage;
  className?: string;
  editable?: boolean;
  onChange?: (stage: JourneyStage) => void;
}

/**
 * Visual mission-journey progression:
 * Candidate → Training → Internship → Commissioned → Church Planting
 * → Multiplication → Regional Leadership → Retired
 */
export function JourneyTimeline({
  current = "Church Planting",
  className,
  editable,
  onChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const idx = JOURNEY_STAGES.indexOf(current);
  return (
    <div className={cn("w-full", className)}>
      {editable ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <Select
                value={current}
                onValueChange={(v) => {
                  onChange?.(v as JourneyStage);
                  setEditing(false);
                }}
              >
                <SelectTrigger className="w-64 rounded-full" aria-label="Set journey stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOURNEY_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit milestone
            </Button>
          )}
        </div>
      ) : null}
      <ol className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8" aria-label="Mission journey">
        {JOURNEY_STAGES.map((stage, i) => {
          const done = i < idx;
          const active = i === idx;
          const clickable = editable && !!onChange;
          const Wrapper: React.ElementType = clickable ? "button" : "div";
          return (
            <li key={stage} className="flex flex-col items-center text-center">
              <Wrapper
                type={clickable ? "button" : undefined}
                onClick={clickable ? () => onChange?.(stage) : undefined}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full text-xs font-semibold shadow-soft transition-colors",
                  done && "bg-secondary text-secondary-foreground",
                  active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !done && !active && "bg-muted text-muted-foreground",
                  clickable && "cursor-pointer hover:ring-2 hover:ring-primary/40",
                )}
                aria-current={active ? "step" : undefined}
                aria-label={clickable ? `Set stage to ${stage}` : undefined}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </Wrapper>
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
