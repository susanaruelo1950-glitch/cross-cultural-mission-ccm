import { useSyncExternalStore } from "react";
import { allAreas, allMissionaries, allPhases } from "@/lib/mission-data";

// Monotonic version counter — bumped on every mutation event so
// useSyncExternalStore always sees a fresh snapshot, whether the change
// came from localStorage (admin's own tab) or a cloud realtime push
// (setCloudMissionaries — which does NOT touch localStorage).
let version = 0;
const listeners = new Set<() => void>();

function bump() {
  version += 1;
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  listeners.add(cb);
  // First subscriber wires up the DOM events.
  if (listeners.size === 1) {
    window.addEventListener("gc-store-changed", bump);
    window.addEventListener("storage", bump);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      window.removeEventListener("gc-store-changed", bump);
      window.removeEventListener("storage", bump);
    }
  };
}

/** Live snapshot of {phases, areas, missionaries} — re-renders on every mutation. */
export function useDataStore() {
  useSyncExternalStore(subscribe, () => version, () => 0);
  return {
    phases: allPhases(),
    areas: allAreas(),
    missionaries: allMissionaries(),
  };
}
