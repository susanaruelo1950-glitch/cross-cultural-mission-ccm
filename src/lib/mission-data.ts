// ============================================================
// Cross-Cultural Mission Management — Data Model
// ------------------------------------------------------------
//   Phase  →  Area  →  Missionary
//
// Seeded with the first batch of FCL (Foundations for Christian
// Leadership) graduates. Extend via the Import (/import) or
// Add / Edit (/manage) screens — runtime additions persist in
// the browser's local storage.
// ============================================================

import vincentRoy from "@/assets/missionaries/vincent-roy-aniversario.json";
import ronieLaud from "@/assets/missionaries/ronie-laud.json";
import joshuaAligarbes from "@/assets/missionaries/joshua-aligarbes.json";
import joliesesLentija from "@/assets/missionaries/jolieses-lentija.json";
import randyTobung from "@/assets/missionaries/randy-tobung.json";
import erleeDadan from "@/assets/missionaries/erlee-dadan.json";
import gilmarkGuyos from "@/assets/missionaries/gilmark-guyos.json";
import vincentJuromay from "@/assets/missionaries/vincent-juromay.json";
import basilioSumido from "@/assets/missionaries/basilio-sumido.json";

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

export interface Phase {
  id: string;
  name: string;
  order: number;
  description?: string;
}

export interface Area {
  id: string;
  phaseId: string;
  name: string;
  region?: string;
  province?: string;
  coordinatorMissionaryId?: string;
  description?: string;
}

export interface Missionary {
  id: string;
  areaId: string;
  fullName: string;
  church: string;
  address: string;
  missionStatement: string;

  photo?: string;
  cover?: string;
  bio?: string;
  lifeVerse?: string;
  vision?: string;
  ministryFocus?: MinistryFocus;
  status?: Status;

  phone?: string;
  email?: string;
  facebook?: string;

  spouse?: string;
  children?: string[];
  birthday?: string;
  anniversary?: string;

  peopleGroup?: string;
  ethnicGroup?: string;
  languages?: string[];
  religiousBackground?: string;

  sendingChurch?: string;
  sendingPastor?: string;
  missionAgency?: string;
  dateSent?: string;

  country?: string;
  region?: string;
  province?: string;
  municipality?: string;
  barangay?: string;
  gps?: [number, number];

  monthlySupportNeeded?: number;
  supportReceived?: number;
  needs?: string[];

  churchesPlanted?: number;
  baptisms?: number;
  bibleStudies?: number;
  leadersTrained?: number;
  populationReached?: number;

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
// SEED — FCL Batch 1 Graduates
// ============================================================

export const seedPhases: Phase[] = [
  {
    id: "phase-1",
    name: "Phase 1 — FCL Batch 1",
    order: 1,
    description:
      "Foundations for Christian Leadership: first batch of commissioned church planter pastors serving in Sultan Kudarat and Maguindanao del Sur.",
  },
];

export const seedAreas: Area[] = [
  {
    id: "area-bagumbayan",
    phaseId: "phase-1",
    name: "Bagumbayan Area",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    description: "Church plants across the municipality of Bagumbayan.",
  },
  {
    id: "area-sen-ninoy-aquino",
    phaseId: "phase-1",
    name: "Senator Ninoy Aquino Area",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    description: "Frontier and tribal ministry in the highlands of Sen. Ninoy Aquino.",
  },
  {
    id: "area-esperanza",
    phaseId: "phase-1",
    name: "Esperanza Area",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
  },
  {
    id: "area-maguindanao",
    phaseId: "phase-1",
    name: "Maguindanao del Sur Area",
    region: "BARMM",
    province: "Maguindanao del Sur",
    description: "Cross-cultural ministry among Muslim communities.",
  },
];

export const seedMissionaries: Missionary[] = [
  // ── Bagumbayan ──────────────────────────────────────────────
  {
    id: "m-vincent-roy-aniversario",
    areaId: "area-bagumbayan",
    fullName: "Vincent Roy L. Aniversario",
    church: "Mission Alliance Church",
    address: "Sto. Niño, Bagumbayan, Sultan Kudarat, Philippines",
    missionStatement: "Leading people to Christ, making disciples, and raising servants of God.",
    photo: vincentRoy.url,
    ministryFocus: "Church Planting",
    status: "Active",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Bagumbayan",
    barangay: "Sto. Niño",
  },
  {
    id: "m-ronie-laud",
    areaId: "area-bagumbayan",
    fullName: "Ronie B. Laud",
    church: "Bagumbayan Fellowship Center",
    address: "Poblacion, Bagumbayan, Sultan Kudarat, Philippines",
    missionStatement:
      "My mission is to follow Jesus and help others to follow Him by growing in God's Word, living like Christ, and sharing His love.",
    photo: ronieLaud.url,
    ministryFocus: "Discipleship",
    status: "Active",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Bagumbayan",
    barangay: "Poblacion",
  },
  {
    id: "m-jolieses-lentija",
    areaId: "area-bagumbayan",
    fullName: "Jolieses C. Lentija",
    church: "Hosanna Fellowship Center Inc.",
    address: "Bai Saripinang, Bagumbayan, Sultan Kudarat, Philippines",
    missionStatement:
      "Ipangaral ang Ebanghelyo, gawing alagad ang lahat at turuan silang sumunod Kay Cristo.",
    photo: joliesesLentija.url,
    ministryFocus: "Church Planting",
    status: "Active",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Bagumbayan",
    barangay: "Bai Saripinang",
  },
  {
    id: "m-randy-tobung",
    areaId: "area-bagumbayan",
    fullName: "Randy G. Tobung",
    church: "Mlock Baptist Church",
    address: "Daluga, Bagumbayan, Sultan Kudarat, Philippines",
    missionStatement:
      "Sa tulong ng Panginoon, maipapahayag at maia-apply ko ang aking natutunan sa CCM sa pamamagitan ng small group, paggawa ng mga alagad, pagtuturo sa mga church leaders, at pagtupad sa church planting mission.",
    photo: randyTobung.url,
    ministryFocus: "Church Planting",
    status: "Active",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Bagumbayan",
    barangay: "Daluga",
  },

  // ── Senator Ninoy Aquino ───────────────────────────────────
  {
    id: "m-joshua-aligarbes",
    areaId: "area-sen-ninoy-aquino",
    fullName: "Joshua M. Aligarbes",
    church: "Isuko Christ Centered Church",
    address: "Banali, Senator Ninoy Aquino, Sultan Kudarat, Philippines",
    missionStatement:
      "My mission is to know, love, and share Jesus with the community. I will make Him the center of my life and service, live as an instrument of His Kingdom, and lead others to experience His love and grace.",
    photo: joshuaAligarbes.url,
    ministryFocus: "Church Planting",
    status: "Active",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Senator Ninoy Aquino",
    barangay: "Banali",
  },
  {
    id: "m-erlee-dadan",
    areaId: "area-sen-ninoy-aquino",
    fullName: "Er Lee Joy R. Dadan",
    church: "Tona Manobo Dulangan Alliance Church",
    address: "Kulaman, Senator Ninoy Aquino, Sultan Kudarat, Philippines",
    missionStatement:
      "I am called to be Christ's witness — leading God's people to maturity, showing His love to others, and empowering the next generation to reflect His glory.",
    photo: erleeDadan.url,
    ministryFocus: "Tribal Ministry",
    status: "Active",
    peopleGroup: "Manobo Dulangan",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Senator Ninoy Aquino",
    barangay: "Kulaman",
  },
  {
    id: "m-gilmark-guyos",
    areaId: "area-sen-ninoy-aquino",
    fullName: "Gil Mark D. Guyos",
    church: "Tower and Banali Alliance Church",
    address: "Buenaflor, Senator Ninoy Aquino, Sultan Kudarat, Philippines",
    missionStatement:
      "My mission is to produce believers who are thriving in their relationship with God through (QUITE) Quality Preaching, Unhurried time for visitations, Intentional Discipleship, Training and Workshops, and Engaging them in Small groups and fellowship.",
    photo: gilmarkGuyos.url,
    ministryFocus: "Discipleship",
    status: "Active",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Senator Ninoy Aquino",
    barangay: "Buenaflor",
  },

  // ── Esperanza ──────────────────────────────────────────────
  {
    id: "m-vincent-juromay",
    areaId: "area-esperanza",
    fullName: "Vincent D. Juromay",
    church: "Lower Numo Alliance Church",
    address: "Purok Narra, Numo, Esperanza, Sultan Kudarat, Philippines",
    missionStatement:
      "My mission is to demonstrate and share the Love of Christ through word and deed.",
    photo: vincentJuromay.url,
    ministryFocus: "Church Planting",
    status: "Active",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Esperanza",
    barangay: "Numo",
  },

  // ── Maguindanao del Sur ────────────────────────────────────
  {
    id: "m-basilio-sumido",
    areaId: "area-maguindanao",
    fullName: "Basilio M. Sumido",
    church: "Mao Alliance Church",
    address: "Mao, Datu Abdullah Sangki, Maguindanao del Sur, Philippines",
    missionStatement:
      "My mission is to plant seeds of hope, nurture disciples, establish churches, and shine the light of Christ in our community and beyond.",
    photo: basilioSumido.url,
    ministryFocus: "Cross-Cultural Ministry",
    status: "Active",
    country: "Philippines",
    region: "BARMM",
    province: "Maguindanao del Sur",
    municipality: "Datu Abdullah Sangki",
    barangay: "Mao",
  },
];

export const seedReports: MinistryReport[] = [];
export const seedPrayer: PrayerRequest[] = [];

// ============================================================
// Runtime store — merges seed with browser-persisted additions.
// Import (/import) and Manage (/manage) write to localStorage;
// pages read via the arrays exported below OR the useDataStore()
// hook for live updates.
// ============================================================

type Store = {
  phases: Phase[];
  areas: Area[];
  missionaries: Missionary[];
};

const STORAGE_KEY = "gc.mission.store.v1";

function readStore(): Store {
  if (typeof window === "undefined") return { phases: [], areas: [], missionaries: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { phases: [], areas: [], missionaries: [] };
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      phases: parsed.phases ?? [],
      areas: parsed.areas ?? [],
      missionaries: parsed.missionaries ?? [],
    };
  } catch {
    return { phases: [], areas: [], missionaries: [] };
  }
}

function writeStore(s: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("gc-store-changed"));
}

export function getRuntimeStore(): Store {
  return readStore();
}

function merge<T extends { id: string }>(seed: T[], extras: T[]): T[] {
  const map = new Map<string, T>();
  for (const s of seed) map.set(s.id, s);
  for (const e of extras) map.set(e.id, e); // extras override / extend
  return Array.from(map.values());
}

/** Merged, live snapshot (seed + localStorage). Recomputed each call. */
export function allPhases(): Phase[] {
  return merge(seedPhases, readStore().phases);
}
export function allAreas(): Area[] {
  return merge(seedAreas, readStore().areas);
}
export function allMissionaries(): Missionary[] {
  return merge(seedMissionaries, readStore().missionaries);
}

// Convenience exports (initial snapshot — pages that want reactivity
// should call the all*() helpers inside a useSyncExternalStore hook
// or use useDataStore() below).
export const phases: Phase[] = allPhases();
export const areas: Area[] = allAreas();
export const missionaries: Missionary[] = allMissionaries();

// ============================================================
// Mutations
// ============================================================

export function upsertPhase(p: Phase) {
  const s = readStore();
  s.phases = s.phases.filter((x) => x.id !== p.id).concat(p);
  writeStore(s);
}
export function upsertArea(a: Area) {
  const s = readStore();
  s.areas = s.areas.filter((x) => x.id !== a.id).concat(a);
  writeStore(s);
}
export function upsertMissionary(m: Missionary) {
  const s = readStore();
  s.missionaries = s.missionaries.filter((x) => x.id !== m.id).concat(m);
  writeStore(s);
}
export function deleteMissionary(id: string) {
  const s = readStore();
  s.missionaries = s.missionaries.filter((x) => x.id !== id);
  writeStore(s);
}
export function resetRuntimeStore() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("gc-store-changed"));
}

export function importPayload(payload: {
  phases?: Phase[];
  areas?: Area[];
  missionaries?: Missionary[];
}) {
  const s = readStore();
  if (payload.phases?.length) {
    for (const p of payload.phases) {
      s.phases = s.phases.filter((x) => x.id !== p.id).concat(p);
    }
  }
  if (payload.areas?.length) {
    for (const a of payload.areas) {
      s.areas = s.areas.filter((x) => x.id !== a.id).concat(a);
    }
  }
  if (payload.missionaries?.length) {
    for (const m of payload.missionaries) {
      s.missionaries = s.missionaries.filter((x) => x.id !== m.id).concat(m);
    }
  }
  writeStore(s);
}

export function exportPayload(): Store {
  return {
    phases: allPhases(),
    areas: allAreas(),
    missionaries: allMissionaries(),
  };
}

// ============================================================
// Helpers (operate against the live, merged data)
// ============================================================

export function getPhase(id: string) {
  return allPhases().find((p) => p.id === id);
}
export function getArea(id: string) {
  return allAreas().find((a) => a.id === id);
}
export function getMissionary(id: string) {
  return allMissionaries().find((m) => m.id === id);
}
export function areasByPhase(phaseId: string) {
  return allAreas().filter((a) => a.phaseId === phaseId);
}
export function missionariesByArea(areaId: string) {
  return allMissionaries().filter((m) => m.areaId === areaId);
}

// Reports & prayer stay seed-only for now (no runtime authoring yet).
export const reports: MinistryReport[] = seedReports;
export const prayerRequests: PrayerRequest[] = seedPrayer;

export function reportsByMissionary(id: string) {
  return reports.filter((r) => r.missionaryId === id);
}
export function prayerByMissionary(id: string) {
  return prayerRequests.filter((p) => p.missionaryId === id);
}

export const regions = Array.from(
  new Set(allMissionaries().map((m) => m.region).filter(Boolean) as string[]),
);
export const provinces = Array.from(
  new Set(allMissionaries().map((m) => m.province).filter(Boolean) as string[]),
);

export const missionStats = {
  get totalMissionaries() { return allMissionaries().length; },
  get totalPhases() { return allPhases().length; },
  get totalAreas() { return allAreas().length; },
  get totalRegions() {
    return new Set(allMissionaries().map((m) => m.region).filter(Boolean)).size;
  },
  get totalProvinces() {
    return new Set(allMissionaries().map((m) => m.province).filter(Boolean)).size;
  },
  get totalChurches() {
    return new Set(allMissionaries().map((m) => m.church)).size;
  },
  get totalActive() {
    return allMissionaries().filter((m) => m.status === "Active").length;
  },
  get totalPrayerRequests() {
    return prayerRequests.filter((p) => !p.answered).length;
  },
  get totalReports() { return reports.length; },
  get totalChurchesPlanted() {
    return allMissionaries().reduce((s, m) => s + (m.churchesPlanted ?? 0), 0);
  },
  get totalBaptisms() {
    return allMissionaries().reduce((s, m) => s + (m.baptisms ?? 0), 0);
  },
  get totalLeadersTrained() {
    return allMissionaries().reduce((s, m) => s + (m.leadersTrained ?? 0), 0);
  },
};

export function missionariesByPhaseCount() {
  return allPhases().map((p) => ({
    name: p.name,
    value: areasByPhase(p.id).reduce(
      (s, a) => s + missionariesByArea(a.id).length,
      0,
    ),
  }));
}

export function missionariesByAreaCount() {
  return allAreas().map((a) => ({
    name: a.name,
    value: missionariesByArea(a.id).length,
  }));
}

export function supportStatus() {
  return allMissionaries()
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
