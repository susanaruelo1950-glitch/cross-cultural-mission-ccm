import { useEffect, useState } from "react";
import type { Missionary } from "@/lib/mission-data";

const KEY = "ccm.mapCache.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

export type MapPin = Missionary & { gps: [number, number] };

type Cache = { ts: number; pins: MapPin[] };

export function readMapCache(): Cache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cache;
    if (!parsed || !Array.isArray(parsed.pins)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeMapCache(pins: MapPin[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), pins }));
  } catch {
    // storage full or blocked — silently ignore
  }
}

/**
 * Returns an offline snapshot of map pins with a daily freshness stamp.
 * - Hydrates instantly from localStorage on open (feels "already loaded").
 * - Refreshes automatically once per day, or when the live dataset changes.
 */
export function useMapOfflineCache(livePins: MapPin[]) {
  const [snapshot, setSnapshot] = useState<{ pins: MapPin[]; stale: boolean; ts: number | null }>(() => {
    const c = readMapCache();
    if (!c) return { pins: livePins, stale: false, ts: null };
    return { pins: c.pins, stale: Date.now() - c.ts > DAY_MS, ts: c.ts };
  });

  useEffect(() => {
    if (!livePins.length) return;
    const cache = readMapCache();
    const dayOld = !cache || Date.now() - cache.ts > DAY_MS;
    const countChanged = !cache || cache.pins.length !== livePins.length;
    if (dayOld || countChanged) {
      writeMapCache(livePins);
      setSnapshot({ pins: livePins, stale: false, ts: Date.now() });
    } else {
      setSnapshot({ pins: livePins, stale: false, ts: cache.ts });
    }
  }, [livePins]);

  return snapshot;
}
