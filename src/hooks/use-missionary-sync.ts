import { useEffect } from "react";
import { toast } from "sonner";
import { subscribeSync } from "@/lib/missionary-sync";
import {
  deleteMissionary,
  upsertArea,
  upsertMissionary,
  upsertPhase,
} from "@/lib/mission-data";

/** Subscribe once (typically from AppLayout) to receive real-time directory
 *  changes broadcast by admins on other devices/tabs. All local writes are
 *  marked `silent` to avoid re-broadcasting. */
export function useMissionarySync() {
  useEffect(() => {
    const unsub = subscribeSync((e) => {
      switch (e.kind) {
        case "missionary_upsert":
          upsertMissionary(e.missionary, { silent: true });
          toast.message(`Directory updated: ${e.missionary.fullName}`);
          break;
        case "missionary_delete":
          deleteMissionary(e.id, { silent: true });
          break;
        case "area_upsert":
          upsertArea(e.area, { silent: true });
          break;
        case "phase_upsert":
          upsertPhase(e.phase, { silent: true });
          break;
      }
    });
    return unsub;
  }, []);
}
