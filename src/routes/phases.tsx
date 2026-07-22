import { createFileRoute, Link } from "@tanstack/react-router";
import { Layers, Users, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { getMissionary } from "@/lib/mission-data";
import { useDataStore } from "@/hooks/use-data-store";
import { useHashScroll } from "@/hooks/use-hash-scroll";

export const Route = createFileRoute("/phases")({
  head: () => ({
    meta: [
      { title: "Phases & Areas — Cross-Cultural Ministry" },
      { name: "description", content: "Cross-Cultural Ministry organizational structure — every phase, area, and coordinator." },
      { property: "og:title", content: "Phases & Areas — Cross-Cultural Ministry" },
      { property: "og:description", content: "Cross-Cultural Ministry organizational structure — every phase, area, and coordinator." },
      { property: "og:url", content: "https://cross-cultural-mission-ccm.lovable.app/phases" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
      { name: "twitter:title", content: "Phases & Areas — Cross-Cultural Ministry" },
      { name: "twitter:description", content: "Cross-Cultural Ministry organizational structure — every phase, area, and coordinator." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/iKAs0JeJ1gdQab7afxdB6C9laCx2/social-images/social-1783503655346-CCM_LOGO.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cross-cultural-mission-ccm.lovable.app/phases" }],
  }),
  component: PhasesPage,
});

function PhasesPage() {
  const { phases, areas, missionaries } = useDataStore();
  const areasByPhase = (id: string) => areas.filter((a) => a.phaseId === id);
  const missionariesByArea = (id: string) => missionaries.filter((m) => m.areaId === id);
  useHashScroll(phases.length);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Phases & Areas</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          The organizational tree: each Phase groups Areas, each Area has a Coordinator, each Coordinator leads a team of missionaries.
        </p>
      </header>

      {phases.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No phases defined yet"
          description="Open src/lib/mission-data.ts and add entries to the phases and areas arrays to get started."
        />
      ) : (
        <div id="phases-list" data-section-anchor className="space-y-6">
          {phases
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((phase) => {
              const phaseAreas = areasByPhase(phase.id);
              return (
                <Card key={phase.id} className="card-soft p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h2 className="font-display text-2xl font-semibold text-primary">{phase.name}</h2>
                      {phase.description ? (
                        <p className="text-sm text-muted-foreground">{phase.description}</p>
                      ) : null}
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {phaseAreas.reduce((s, a) => s + missionariesByArea(a.id).length, 0)} missionaries
                    </Badge>
                  </div>

                  {phaseAreas.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">No areas in this phase yet.</p>
                  ) : (
                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {phaseAreas.map((area) => {
                        const team = missionariesByArea(area.id);
                        const coordinator = area.coordinatorMissionaryId
                          ? getMissionary(area.coordinatorMissionaryId)
                          : undefined;
                        return (
                          <div key={area.id} className="rounded-2xl border border-border p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-display text-lg font-semibold">{area.name}</div>
                                {area.province ? (
                                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5" /> {area.province}
                                  </div>
                                ) : null}
                              </div>
                              <Badge variant="outline" className="rounded-full">
                                <Users className="mr-1 h-3 w-3" /> {team.length}
                              </Badge>
                            </div>
                            {coordinator ? (
                              <div className="mt-3 rounded-xl bg-accent px-3 py-2 text-sm">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">Coordinator</div>
                                <Link
                                  to="/missionaries/$id"
                                  params={{ id: coordinator.id }}
                                  className="font-medium text-primary hover:underline"
                                >
                                  {coordinator.fullName}
                                </Link>
                              </div>
                            ) : null}
                            {team.length > 0 ? (
                              <ul className="mt-3 space-y-1 text-sm">
                                {team.map((m) => (
                                  <li key={m.id}>
                                    <Link
                                      to="/missionaries/$id"
                                      params={{ id: m.id }}
                                      className="hover:text-primary"
                                    >
                                      • {m.fullName}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-3 text-xs text-muted-foreground">No missionaries yet.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
