import { useSyncExternalStore, useCallback } from "react";

/**
 * Cross-surface filter state shared by the Dashboard, Missionary Directory, and
 * AI Assistant. Persisted in localStorage and synced live via a broadcast event
 * so changing a filter on one page updates the others instantly (same tab) and
 * across tabs (via the native `storage` event).
 */
export const ALL = "__all__";

export interface SharedFilters {
  regionId: string;
  provinceId: string;
  phaseId: string;
  partnerId: string;
}

const KEY = "ccm.sharedFilters.v2";
const EVENT = "ccm-shared-filters-changed";
const DEFAULT: SharedFilters = { regionId: ALL, provinceId: ALL, phaseId: ALL, partnerId: ALL };

function read(): SharedFilters {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<SharedFilters>;
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

function write(next: SharedFilters) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVENT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
}

// Cached snapshot so useSyncExternalStore gets a stable reference between reads.
let cache: SharedFilters = DEFAULT;
let cacheKey = "";
function snapshot(): SharedFilters {
  if (typeof window === "undefined") return DEFAULT;
  const raw = window.localStorage.getItem(KEY) ?? "";
  if (raw !== cacheKey) {
    cacheKey = raw;
    cache = read();
  }
  return cache;
}

export function useSharedFilters() {
  const filters = useSyncExternalStore(subscribe, snapshot, () => DEFAULT);

  const setFilters = useCallback((patch: Partial<SharedFilters>) => {
    const current = read();
    const next = { ...current, ...patch };
    // Cascade: changing region resets province to All.
    if (patch.regionId !== undefined && patch.regionId !== current.regionId) {
      next.provinceId = ALL;
    }
    write(next);
  }, []);

  const reset = useCallback(() => write(DEFAULT), []);

  return { filters, setFilters, reset };
}
