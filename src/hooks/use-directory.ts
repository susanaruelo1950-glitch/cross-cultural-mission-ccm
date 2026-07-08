import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  seedPhases,
  seedAreas,
  type Phase,
  type Area,
} from "@/lib/mission-data";

export interface DbRegion { id: string; name: string }
export interface DbProvince { id: string; region_id: string; name: string }

/**
 * DB-backed directory (phases, areas, regions, provinces). Falls back to
 * the in-memory seed data if the DB call is still loading or fails, so
 * the UI never shows an empty filter list.
 */
export function useDirectory() {
  const phasesQ = useQuery({
    queryKey: ["dir", "phases"],
    queryFn: async (): Promise<Phase[]> => {
      const { data, error } = await supabase
        .from("phases")
        .select("id, name, order, description")
        .order("order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        order: p.order,
        description: p.description ?? undefined,
      }));
    },
    staleTime: 5 * 60_000,
  });

  const areasQ = useQuery({
    queryKey: ["dir", "areas"],
    queryFn: async (): Promise<Area[]> => {
      const { data, error } = await supabase
        .from("areas")
        .select("id, phase_id, name, region_id, province_id, description, coordinator_name, gps_lat, gps_lng");
      if (error) throw error;
      return (data ?? []).map((a) => ({
        id: a.id,
        phaseId: a.phase_id,
        name: a.name,
        region: a.region_id ?? undefined,
        province: a.province_id ?? undefined,
        description: a.description ?? undefined,
        coordinatorName: a.coordinator_name ?? undefined,
        gps: a.gps_lat != null && a.gps_lng != null ? [a.gps_lat, a.gps_lng] : undefined,
      }));
    },
    staleTime: 5 * 60_000,
  });

  const regionsQ = useQuery({
    queryKey: ["dir", "regions"],
    queryFn: async (): Promise<DbRegion[]> => {
      const { data, error } = await supabase.from("regions").select("id, name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const provincesQ = useQuery({
    queryKey: ["dir", "provinces"],
    queryFn: async (): Promise<DbProvince[]> => {
      const { data, error } = await supabase.from("provinces").select("id, region_id, name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  return {
    phases: phasesQ.data && phasesQ.data.length ? phasesQ.data : seedPhases,
    areas: areasQ.data && areasQ.data.length ? areasQ.data : seedAreas,
    regions: regionsQ.data ?? [],
    provinces: provincesQ.data ?? [],
    loading: phasesQ.isLoading || areasQ.isLoading,
  };
}
