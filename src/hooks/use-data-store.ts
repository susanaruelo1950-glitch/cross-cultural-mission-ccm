import { useSyncExternalStore } from "react";
import { allAreas, allMissionaries, allPhases } from "@/lib/mission-data";

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("gc-store-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("gc-store-changed", handler);
    window.removeEventListener("storage", handler);
  };
}

/** Live snapshot of {phases, areas, missionaries} — re-renders on mutations. */
export function useDataStore() {
  // Increment via event; the returned object is recomputed each time.
  const version = useSyncExternalStore(
    subscribe,
    () => (typeof window === "undefined" ? 0 : window.localStorage.getItem("gc.mission.store.v1")?.length ?? 0),
    () => 0,
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void version;
  return {
    phases: allPhases(),
    areas: allAreas(),
    missionaries: allMissionaries(),
  };
}
