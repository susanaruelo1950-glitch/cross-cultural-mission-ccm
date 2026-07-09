import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribes to every admin-managed table and invalidates the matching
 * React Query caches so any change (any device, any admin) reflects
 * across the app in real time. Mount ONCE in AppLayout.
 */
const TABLE_TO_KEYS: Record<string, string[][]> = {
  ministry_updates: [["ministry_updates"]],
  thank_you_letters: [["thank_you_letters"], ["thank_you_letters_admin"]],
  prayer_requests_db: [["prayer_requests_db"]],
  scriptures: [["scriptures"]],
  coordinator_assignments: [["coordinator_assignments"]],
  missionary_photos: [["missionary_photo"], ["missionary_cover"]],
};

export function useGlobalRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("global_admin_sync");
    for (const table of Object.keys(TABLE_TO_KEYS)) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          for (const key of TABLE_TO_KEYS[table]) {
            qc.invalidateQueries({ queryKey: key });
          }
        },
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
