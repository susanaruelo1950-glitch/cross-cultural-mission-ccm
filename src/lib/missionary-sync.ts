// Cross-device real-time sync for the local missionary/area/phase store.
// Uses a Supabase Realtime broadcast channel so admin edits made on one
// device propagate to everyone else viewing the app — without requiring a
// full DB migration of the seed store.
import { supabase } from "@/integrations/supabase/client";
import type { Area, Missionary, Phase } from "@/lib/mission-data";

export type SyncEvent =
  | { kind: "missionary_upsert"; missionary: Missionary; senderId: string }
  | { kind: "missionary_delete"; id: string; senderId: string }
  | { kind: "area_upsert"; area: Area; senderId: string }
  | { kind: "phase_upsert"; phase: Phase; senderId: string };

const CHANNEL = "ccm-directory-sync";
const EVENT = "change";

// Random per-tab id so we can ignore echoes of our own broadcasts.
export const SENDER_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

let channel: ReturnType<typeof supabase.channel> | null = null;

function ensureChannel() {
  if (channel || typeof window === "undefined") return channel;
  channel = supabase.channel(CHANNEL, { config: { broadcast: { self: false } } });
  channel.subscribe();
  return channel;
}

export function broadcastSync(payload: Omit<SyncEvent, "senderId">) {
  const ch = ensureChannel();
  if (!ch) return;
  const event = { ...payload, senderId: SENDER_ID } as SyncEvent;
  // Fire and forget — best-effort broadcast.
  void ch.send({ type: "broadcast", event: EVENT, payload: event });
}

export function subscribeSync(handler: (e: SyncEvent) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const ch = supabase.channel(CHANNEL, { config: { broadcast: { self: false } } });
  ch.on("broadcast", { event: EVENT }, ({ payload }) => {
    const evt = payload as SyncEvent;
    if (!evt || evt.senderId === SENDER_ID) return;
    handler(evt);
  });
  ch.subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}
