import { useMemo } from "react";
import { Filter, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useDirectory } from "@/hooks/use-directory";
import { ALL, useSharedFilters } from "@/hooks/use-shared-filters";


/**
 * Region / Province / Phase / Partner filter bar. State is stored in the
 * shared filter store, so it stays in sync across the Dashboard, Missionary
 * Directory, and the AI Assistant's answer scope.
 */
export function SharedFilterBar({
  compact = false,
  label = "Dashboard filters",
  hint = "These filters follow you to Missionaries and the AI Assistant.",
}: { compact?: boolean; label?: string; hint?: string }) {
  const { regions, provinces, phases } = useDirectory();
  const { filters, setFilters, reset } = useSharedFilters();

  const visibleProvinces = useMemo(
    () => (filters.regionId === ALL ? provinces : provinces.filter((p) => p.region_id === filters.regionId)),
    [provinces, filters.regionId],
  );
  const active =
    filters.regionId !== ALL ||
    filters.provinceId !== ALL ||
    filters.phaseId !== ALL ||
    filters.partnerId !== ALL;

  return (
    <section
      aria-label={label}
      className={`card-soft ${compact ? "p-3" : "p-4"}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Filter className="h-3.5 w-3.5" aria-hidden /> {label}
        </div>
        {active ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 min-h-11 rounded-full text-xs sm:min-h-9"
            onClick={reset}
            aria-label="Clear all dashboard filters"
          >
            <X className="h-3.5 w-3.5" aria-hidden /> Clear
          </Button>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Select value={filters.regionId} onValueChange={(v) => setFilters({ regionId: v })}>
          <SelectTrigger aria-label="Filter by region" className="min-h-11">
            <SelectValue placeholder="All regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All regions</SelectItem>
            {regions.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filters.provinceId} onValueChange={(v) => setFilters({ provinceId: v })}>
          <SelectTrigger aria-label="Filter by province" className="min-h-11">
            <SelectValue placeholder="All provinces" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All provinces</SelectItem>
            {visibleProvinces.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filters.phaseId} onValueChange={(v) => setFilters({ phaseId: v })}>
          <SelectTrigger aria-label="Filter by mission phase" className="min-h-11">
            <SelectValue placeholder="All phases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All phases</SelectItem>
            {phases.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>
    </section>
  );
}
