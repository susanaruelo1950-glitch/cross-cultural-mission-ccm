import { createFileRoute, Link } from "@tanstack/react-router";
import { HeartHandshake, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/EmptyState";
import { missionaries } from "@/lib/mission-data";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support Center — Cross-Cultural Mission" },
      { name: "description", content: "Monthly support needs and special projects for every missionary." },
    ],
  }),
  component: SupportPage,
});

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function SupportPage() {
  const withSupport = missionaries.filter((m) => (m.monthlySupportNeeded ?? 0) > 0);
  const totalNeeded = withSupport.reduce((s, m) => s + (m.monthlySupportNeeded ?? 0), 0);
  const totalReceived = withSupport.reduce((s, m) => s + (m.supportReceived ?? 0), 0);
  const percent = totalNeeded ? Math.round((totalReceived / totalNeeded) * 100) : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Support Center</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Every pastor is fully known and fully cared for. Track monthly needs and special projects.
        </p>
      </header>

      {withSupport.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No support info yet"
          description="Add monthlySupportNeeded and supportReceived values to a missionary to track their support here."
        />
      ) : (
        <>
          <Card className="card-soft gradient-mission p-6 text-white shadow-lift sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <div className="text-sm text-white/80">Total monthly support</div>
                <div className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                  ₱{totalReceived.toLocaleString()} <span className="text-lg font-normal text-white/80">/ ₱{totalNeeded.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/80">Overall funded</div>
                <div className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{percent}%</div>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {withSupport.map((m) => {
              const needed = m.monthlySupportNeeded ?? 0;
              const received = m.supportReceived ?? 0;
              const pct = needed ? Math.round((received / needed) * 100) : 0;
              const remaining = Math.max(0, needed - received);
              const needs = m.needs ?? [];
              return (
                <Card key={m.id} className="card-soft p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={m.photo} alt={m.fullName} />
                      <AvatarFallback className="bg-primary/10 text-primary">{initials(m.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link to="/missionaries/$id" params={{ id: m.id }} className="font-display text-lg font-semibold hover:text-primary">
                          {m.fullName}
                        </Link>
                        <span className="text-sm text-muted-foreground">{pct}%</span>
                      </div>
                      {m.church ? <p className="text-sm text-muted-foreground">{m.church}</p> : null}
                      <Progress value={pct} className="mt-2 h-2" />
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-secondary">Received ₱{received.toLocaleString()}</span>
                        {remaining > 0 ? (
                          <span className="rounded-full bg-warm px-2 py-0.5 text-warm-foreground">Remaining ₱{remaining.toLocaleString()}</span>
                        ) : (
                          <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-secondary">Fully funded</span>
                        )}
                      </div>
                      {needs.length ? (
                        <div className="mt-3">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current needs</div>
                          <ul className="mt-1 text-sm">
                            {needs.map((n) => (<li key={n}>• {n}</li>))}
                          </ul>
                        </div>
                      ) : null}
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" className="rounded-full"><Wallet className="h-4 w-4" /> Give</Button>
                        <Button size="sm" variant="outline" className="rounded-full"><HeartHandshake className="h-4 w-4" /> Pray</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
