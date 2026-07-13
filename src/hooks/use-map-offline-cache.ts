import { useEffect, useState } from "react";
import type { Missionary } from "@/lib/mission-data";

const KEY = "ccm.mapCache.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

export type MapPin = Missionary & { gps: [number, number] };

type Cache = { ts: number; pins: MapPin[] };
type Snapshot = { pins: MapPin[]; stale: boolean; ts: number | null; signature: string };

function pinSignature(pins: MapPin[]): string {
  return pins
    .map((pin) => `${pin.id}:${pin.fullName}:${pin.areaId}:${pin.gps[0]},${pin.gps[1]}`)
    .join("|");
}

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
  const [snapshot, setSnapshot] = useState<Snapshot>(() => {
    const c = readMapCache();
    if (!c) return { pins: livePins, stale: false, ts: null, signature: pinSignature(livePins) };
    return { pins: c.pins, stale: Date.now() - c.ts > DAY_MS, ts: c.ts, signature: pinSignature(c.pins) };
  });

  useEffect(() => {
    if (!livePins.length) return;
    const cache = readMapCache();
    const liveSignature = pinSignature(livePins);
    const cacheSignature = cache ? pinSignature(cache.pins) : "";
    const dayOld = !cache || Date.now() - cache.ts > DAY_MS;
    const dataChanged = !cache || cacheSignature !== liveSignature;
    if (dayOld || dataChanged) {
      const ts = Date.now();
      writeMapCache(livePins);
      setSnapshot((prev) =>
        prev.signature === liveSignature && prev.ts === ts && !prev.stale
          ? prev
          : { pins: livePins, stale: false, ts, signature: liveSignature },
      );
    } else {
      setSnapshot((prev) =>
        prev.signature === liveSignature && prev.ts === cache.ts && !prev.stale
          ? prev
          : { pins: livePins, stale: false, ts: cache.ts, signature: liveSignature },
      );
    }
  }, [livePins]);

  return snapshot;
}
