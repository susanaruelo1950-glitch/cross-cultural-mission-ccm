import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Partner {
  id: string;
  slug: string;
  short_name: string;
  full_name: string;
  logo_url: string | null;
  link_url: string | null;
  display_order: number;
  active: boolean;
}

export const PARTNERS_KEY = ["partners", "public"] as const;

/**
 * Live-synced partners directory. Reads all active partners ordered by
 * `display_order`, and subscribes to realtime changes so admin edits appear
 * everywhere immediately.
 */
export function usePartners() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: PARTNERS_KEY,
    queryFn: async (): Promise<Partner[]> => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true })
        .order("short_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Partner[];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("partners-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partners" },
        () => qc.invalidateQueries({ queryKey: ["partners"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);

  return q;
}
