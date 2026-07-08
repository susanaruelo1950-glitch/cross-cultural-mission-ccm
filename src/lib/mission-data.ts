// ============================================================
// Cross-Cultural Mission Management — Data Model
// ------------------------------------------------------------
// Organized to match how the field data is actually collected:
//
//   Phase  →  Area (with a Coordinator)  →  Missionary
//
// Each missionary carries the core fields from the printed
// directory (Full Name, Church, Address, Mission Statement)
// plus optional profile & contact details.
//
// All arrays below are intentionally EMPTY. Add your real data
// where indicated — the entire app renders empty-states until
// you do.
// ============================================================

export type Status = "Active" | "On Leave" | "Retired" | "Transferred" | "Completed";

export type MinistryFocus =
  | "Church Planting"
  | "Campus Ministry"
  | "Children's Ministry"
  | "Tribal Ministry"
  | "Urban Ministry"
  | "Cross-Cultural Ministry"
  | "Youth Ministry"
  | "Family Ministry"
  | "Discipleship"
  | "Other";

/** A high-level program phase (e.g. "Phase 1", "Phase 2"). */
export interface Phase {
  id: string;
  name: string;
  order: number;
  description?: string;
}

/** A geographic / operational grouping inside a Phase. */
export interface Area {
  id: string;
  phaseId: string;
  name: string;
  region?: string;
  province?: string;
  coordinatorMissionaryId?: string;
  description?: string;
}

/** A church planter / missionary record. */
export interface Missionary {
  id: string;
  areaId: string;

  // Core (from directory)
  fullName: string;
  church: string;
  address: string;
  missionStatement: string;

  // Optional profile
  photo?: string;
  cover?: string;
  bio?: string;
  lifeVerse?: string;
  vision?: string;
  ministryFocus?: MinistryFocus;
  status?: Status;

  // Contact
  phone?: string;
  email?: string;
  facebook?: string;

  // Family
  spouse?: string;
  children?: string[];
  birthday?: string;
  anniversary?: string;

  // Field
  peopleGroup?: string;
  ethnicGroup?: string;
  languages?: string[];
  religiousBackground?: string;

  // Sending
  sendingChurch?: string;
  sendingPastor?: string;
  missionAgency?: string;
  dateSent?: string;

  // Location
  country?: string;
  region?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  gps?: [number, number];

  // Support
  monthlySupportNeeded?: number;
  supportReceived?: number;
  needs?: string[];

  // Impact
  churchesPlanted?: number;
  baptisms?: number;
  bibleStudies?: number;
  leadersTrained?: number;
  populationReached?: number;

  // Media / history
  gallery?: { url: string; caption?: string; album?: string }[];
  timeline?: { date: string; title: string; description?: string }[];
}

export interface MinistryReport {
  id: string;
  missionaryId: string;
  title: string;
  date: string;
  summary: string;
  fullReport?: string;
  salvations?: number;
  baptisms?: number;
  bibleStudies?: number;
  attendance?: number;
  newBelievers?: number;
  leadersTrained?: number;
  prayerRequests?: string[];
  praiseReports?: string[];
  challenges?: string[];
  photos?: string[];
}

export interface PrayerRequest {
  id: string;
  missionaryId: string;
  title: string;
  detail: string;
  date: string;
  urgent?: boolean;
  answered?: boolean;
}

// ============================================================
// SCAFFOLD — Phases & Areas
// ------------------------------------------------------------
// Edit these to match your organization. They are the
// classification the whole app groups everything under.
// ============================================================

export const phases: Phase[] = [
  // Example (edit or replace):
  // { id: "phase-1", name: "Phase 1", order: 1, description: "Sarangani & Sultan Kudarat" },
  // { id: "phase-2", name: "Phase 2", order: 2, description: "Davao & Cotabato" },
];

export const areas: Area[] = [
  // Example:
  // { id: "area-bansalan", phaseId: "phase-2", name: "Bansalan Area", province: "Davao del Sur" },
];

// ============================================================
// DATA — fill these in
// ============================================================

export const missionaries: Missionary[] = [
  // Example missionary shape:
  // {
  //   id: "m-001",
  //   areaId: "area-bansalan",
  //   fullName: "Juan D. Cruz",
  //   church: "Grace Community Church",
  //   address: "Purok 5, Buenavista, Bansalan, Davao del Sur",
  //   missionStatement: "To glorify God by making disciples of all nations.",
  //   photo: "",
  //   ministryFocus: "Church Planting",
  //   status: "Active",
  // },
];

export const reports: MinistryReport[] = [];

export const prayerRequests: PrayerRequest[] = [];

// ============================================================
// Helpers (safe on empty data)
// ============================================================

export function getPhase(id: string) {
  return phases.find((p) => p.id === id);
}
export function getArea(id: string) {
  return areas.find((a) => a.id === id);
}
export function getMissionary(id: string) {
  return missionaries.find((m) => m.id === id);
}
export function areasByPhase(phaseId: string) {
  return areas.filter((a) => a.phaseId === phaseId);
}
export function missionariesByArea(areaId: string) {
  return missionaries.filter((m) => m.areaId === areaId);
}
export function reportsByMissionary(id: string) {
  return reports.filter((r) => r.missionaryId === id);
}
export function prayerByMissionary(id: string) {
  return prayerRequests.filter((p) => p.missionaryId === id);
}

export const regions = Array.from(
  new Set(missionaries.map((m) => m.region).filter(Boolean) as string[]),
);
export const provinces = Array.from(
  new Set(missionaries.map((m) => m.province).filter(Boolean) as string[]),
);

export const missionStats = {
  totalMissionaries: missionaries.length,
  totalPhases: phases.length,
  totalAreas: areas.length,
  totalRegions: regions.length,
  totalProvinces: provinces.length,
  totalChurches: new Set(missionaries.map((m) => m.church)).size,
  totalActive: missionaries.filter((m) => m.status === "Active").length,
  totalPrayerRequests: prayerRequests.filter((p) => !p.answered).length,
  totalReports: reports.length,
  totalChurchesPlanted: missionaries.reduce((s, m) => s + (m.churchesPlanted ?? 0), 0),
  totalBaptisms: missionaries.reduce((s, m) => s + (m.baptisms ?? 0), 0),
  totalLeadersTrained: missionaries.reduce((s, m) => s + (m.leadersTrained ?? 0), 0),
};

export function missionariesByPhaseCount() {
  return phases.map((p) => ({
    name: p.name,
    value: areasByPhase(p.id).reduce(
      (s, a) => s + missionariesByArea(a.id).length,
      0,
    ),
  }));
}

export function missionariesByAreaCount() {
  return areas.map((a) => ({
    name: a.name,
    value: missionariesByArea(a.id).length,
  }));
}

export function supportStatus() {
  return missionaries
    .filter((m) => m.monthlySupportNeeded)
    .map((m) => {
      const needed = m.monthlySupportNeeded ?? 0;
      const received = m.supportReceived ?? 0;
      return {
        name: m.fullName,
        received,
        needed,
        percent: needed ? Math.round((received / needed) * 100) : 0,
      };
    });
}
