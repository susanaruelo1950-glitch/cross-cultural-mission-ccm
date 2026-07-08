import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("card-soft flex flex-col items-center justify-center p-10 text-center", className)}>
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}
