import type { Missionary } from "./mission-data";

/**
 * Sending-partner catalog. `matches` is a case-insensitive regex tested
 * against a missionary's `sendingChurch`, `missionAgency`, and `sendingPastor`
 * fields so partners can be inferred from existing data without requiring
 * every profile to be re-encoded. Extend as new partners join.
 */
export interface PartnerOption {
  id: string;
  short: string;
  name: string;
  matches: RegExp;
}

export const PARTNER_OPTIONS: PartnerOption[] = [
  {
    id: "cbcp",
    short: "CBCP",
    name: "Christian Bible Church of the Philippines",
    matches: /\b(cbcp|christian bible church)\b/i,
  },
  {
    id: "igsl",
    short: "IGSL",
    name: "International Graduate School of Leadership",
    matches: /\b(igsl|international graduate school)\b/i,
  },
  {
    id: "fcl",
    short: "FCL",
    name: "Foundations for Christian Leadership",
    matches: /\b(fcl|foundations for christian leadership)\b/i,
  },
];

/** Returns the partner ID a missionary is affiliated with, or null. */
export function partnerIdFor(m: Missionary): string | null {
  // Explicit override wins if the profile carries one.
  const override = (m as unknown as { supportingPartner?: string }).supportingPartner;
  if (override) {
    const hit = PARTNER_OPTIONS.find((p) => p.id === override.toLowerCase());
    if (hit) return hit.id;
  }
  const haystack = [m.sendingChurch, m.missionAgency, m.sendingPastor]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const hit = PARTNER_OPTIONS.find((p) => p.matches.test(haystack));
  return hit?.id ?? null;
}

export function missionaryMatchesPartner(m: Missionary, partnerId: string): boolean {
  return partnerIdFor(m) === partnerId;
}
