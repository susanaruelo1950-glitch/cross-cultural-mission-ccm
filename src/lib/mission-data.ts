// ============================================================
// Cross-Cultural Mission Management — Data Model
// ------------------------------------------------------------
//   Phase  →  Area  →  Missionary
// Seeded with FCL Batch 1 & Batch 2 graduates.
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

export type JourneyStage =
  | "Candidate"
  | "Training"
  | "Internship"
  | "Commissioned"
  | "Church Planting"
  | "Multiplication"
  | "Regional Leadership"
  | "Retired";

export const JOURNEY_STAGES: JourneyStage[] = [
  "Candidate",
  "Training",
  "Internship",
  "Commissioned",
  "Church Planting",
  "Multiplication",
  "Regional Leadership",
  "Retired",
];

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
  coordinatorName?: string;
  description?: string;
  gps?: [number, number];
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
  journeyStage?: JourneyStage;

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
// SEED — FCL Batches
// ============================================================

export const seedPhases: Phase[] = [
  {
    id: "phase-1",
    name: "Phase 1 — FCL Batch 1",
    order: 1,
    description:
      "First batch of commissioned church planter pastors serving in Sultan Kudarat and Maguindanao del Sur.",
  },
  {
    id: "phase-2",
    name: "Phase 2 — FCL Batch 2",
    order: 2,
    description:
      "Second batch of church planter pastors serving across Sarangani, Sultan Kudarat, Davao del Sur, and Cotabato.",
  },
];

export const seedAreas: Area[] = [
  // ── Phase 1 ─────────────────────────────
  {
    id: "area-bagumbayan",
    phaseId: "phase-1",
    name: "Bagumbayan Area",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    description: "Church plants across the municipality of Bagumbayan.",
    gps: [6.828, 124.762],
  },
  {
    id: "area-sen-ninoy-aquino",
    phaseId: "phase-1",
    name: "Senator Ninoy Aquino Area",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    description: "Frontier and tribal ministry in the highlands of Sen. Ninoy Aquino.",
    gps: [6.542, 124.590],
  },
  {
    id: "area-esperanza",
    phaseId: "phase-1",
    name: "Esperanza Area",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    gps: [6.700, 124.720],
  },
  {
    id: "area-maguindanao",
    phaseId: "phase-1",
    name: "Maguindanao del Sur Area",
    region: "BARMM",
    province: "Maguindanao del Sur",
    description: "Cross-cultural ministry among Muslim communities.",
    gps: [6.898, 124.520],
  },
  // ── Phase 2 ─────────────────────────────
  {
    id: "area-maitum",
    phaseId: "phase-2",
    name: "Maitum Area",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sarangani",
    coordinatorName: "Johnnely A. Delos Reyes",
    description: "Wesleyan church plants across Maitum, Kiamba, and Maasim.",
    gps: [6.038, 124.492],
  },
  {
    id: "area-bansalan",
    phaseId: "phase-2",
    name: "Bansalan Area",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    coordinatorName: "Jolle E. Malik",
    description: "Alliance church planting ministries around Bansalan and Digos.",
    gps: [6.783, 125.213],
  },
  {
    id: "area-digos",
    phaseId: "phase-2",
    name: "Digos Area",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    coordinatorName: "Ptr. Lazaro E. Bangcas",
    description: "Church planting ministries across Digos City, Sulop, and Hagonoy.",
    gps: [6.750, 125.357],
  },
  {
    id: "area-arakan",
    phaseId: "phase-2",
    name: "Arakan Area",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    coordinatorName: "Ronilo E. Dalisay",
    description: "Alliance fellowships and church plants across Arakan Valley.",
    gps: [7.398, 125.135],
  },
];

// Small deterministic offset so pins in the same area don't stack.
function offset(base: [number, number], i: number): [number, number] {
  const dx = ((i % 5) - 2) * 0.018;
  const dy = (Math.floor(i / 5) - 1) * 0.018;
  return [base[0] + dy, base[1] + dx];
}

const bagumbayan = seedAreas.find((a) => a.id === "area-bagumbayan")!.gps!;
const snaGps = seedAreas.find((a) => a.id === "area-sen-ninoy-aquino")!.gps!;
const espGps = seedAreas.find((a) => a.id === "area-esperanza")!.gps!;
const magGps = seedAreas.find((a) => a.id === "area-maguindanao")!.gps!;
const maitumGps = seedAreas.find((a) => a.id === "area-maitum")!.gps!;
const bansalanGps = seedAreas.find((a) => a.id === "area-bansalan")!.gps!;
const digosGps = seedAreas.find((a) => a.id === "area-digos")!.gps!;
const arakanGps = seedAreas.find((a) => a.id === "area-arakan")!.gps!;

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
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Bagumbayan",
    barangay: "Sto. Niño",
    gps: offset(bagumbayan, 0),
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
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Bagumbayan",
    barangay: "Poblacion",
    gps: offset(bagumbayan, 1),
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
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Bagumbayan",
    barangay: "Bai Saripinang",
    gps: offset(bagumbayan, 2),
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
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Bagumbayan",
    barangay: "Daluga",
    gps: offset(bagumbayan, 3),
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
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Senator Ninoy Aquino",
    barangay: "Banali",
    gps: offset(snaGps, 0),
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
    journeyStage: "Church Planting",
    peopleGroup: "Manobo Dulangan",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Senator Ninoy Aquino",
    barangay: "Kulaman",
    gps: offset(snaGps, 1),
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
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Senator Ninoy Aquino",
    barangay: "Buenaflor",
    gps: offset(snaGps, 2),
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
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Esperanza",
    barangay: "Numo",
    gps: offset(espGps, 0),
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
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "BARMM",
    province: "Maguindanao del Sur",
    municipality: "Datu Abdullah Sangki",
    barangay: "Mao",
    gps: offset(magGps, 0),
  },

  // ============================================================
  // PHASE 2 — FCL Batch 2
  // ============================================================

  // ── Maitum Area ─────────────────────────────────────────────
  {
    id: "m-johnnely-delos-reyes",
    areaId: "area-maitum",
    fullName: "Johnnely A. Delos Reyes",
    church: "Old Poblacion Wesleyan Church",
    address: "Purok 3, Old Poblacion, Maitum, Sarangani Province",
    missionStatement:
      "To glorify God by making disciples, mobilizing the church, and advancing Christ's mission among unreached peoples.",
    ministryFocus: "Cross-Cultural Ministry",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sarangani",
    municipality: "Maitum",
    gps: offset(maitumGps, 0),
  },
  {
    id: "m-christopher-llego",
    areaId: "area-maitum",
    fullName: "Christopher Q. Llego",
    church: "Tabutong Wesleyan Church",
    address: "Purok Rosas, Poblacion, Kiamba, Sarangani Province",
    missionStatement:
      "To guide young people to know Christ, grow in faith, and show God's love through compassionate service.",
    ministryFocus: "Youth Ministry",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sarangani",
    municipality: "Kiamba",
    gps: offset(maitumGps, 1),
  },
  {
    id: "m-jerson-lumbay",
    areaId: "area-maitum",
    fullName: "Jerson S. Lumbay",
    church: "Baluno Wesleyan Church",
    address: "Brgy. Lumuyon, Matablao, Sarangani Province",
    missionStatement: "Equipping families to connect, grow, and serve together in faith.",
    ministryFocus: "Family Ministry",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sarangani",
    municipality: "Matablao",
    gps: offset(maitumGps, 2),
  },
  {
    id: "m-john-rey-ubando",
    areaId: "area-maitum",
    fullName: "John Rey G. Ubando",
    church: "Kisek & Namat Wesleyan Church",
    address: "Brgy. Kisek, Palimbang, Sultan Kudarat",
    missionStatement:
      "To glorify God by leading people to Jesus Christ through love, prayer, and biblical teaching, equipping and discipling them to grow in faith and live according to God's purpose.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sultan Kudarat",
    municipality: "Palimbang",
    barangay: "Kisek",
    gps: offset(maitumGps, 3),
  },
  {
    id: "m-elmar-manton",
    areaId: "area-maitum",
    fullName: "Elmar T. Manton",
    church: "Sitio Lamlahak Wesleyan Church",
    address: "Purok Bagakay, Lumatil, Maasim, Sarangani Province",
    missionStatement:
      "To glorify God by faithfully shepherding tribal communities through tribal ministry, building meaningful Christ-centered relationships, living a life devoted to Him, and making disciples among tribal communities.",
    ministryFocus: "Tribal Ministry",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sarangani",
    municipality: "Maasim",
    barangay: "Lumatil",
    gps: offset(maitumGps, 4),
  },
  {
    id: "m-maricel-alam",
    areaId: "area-maitum",
    fullName: "Maricel A. Alam",
    church: "Sakisang Wesleyan Church",
    address: "Barangay Zion, Salidok, Maitum, Sarangani Province",
    missionStatement:
      "To glorify God by faithfully evangelizing sinners, making disciples, and equipping believers to be deeply rooted in God's Word and actively serve His Kingdom.",
    ministryFocus: "Discipleship",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Sarangani",
    municipality: "Maitum",
    barangay: "Zion, Salidok",
    gps: offset(maitumGps, 5),
  },

  // ── Bansalan Area ───────────────────────────────────────────
  {
    id: "m-jolle-malik",
    areaId: "area-bansalan",
    fullName: "Jolle E. Malik",
    church: "Kanapolo Alliance Missional Church",
    address: "Purok 5, Buenavista, Bansalan, Davao del Sur",
    missionStatement:
      "In response to the great commission, my mission in life is to continually equip and mobilize churches within my reach to plant another church for the glory of the Mighty and Holy God.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Regional Leadership",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Bansalan",
    barangay: "Buenavista",
    gps: offset(bansalanGps, 0),
  },
  {
    id: "m-samuel-onotan",
    areaId: "area-bansalan",
    fullName: "Samuel M. Onotan",
    church: "Tubod Alliance Church",
    address: "Anonang, Bansalan, Davao del Sur",
    missionStatement:
      "My mission in life is to faithfully establish a responsible and reproducing church members for His glory and honor.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Bansalan",
    gps: offset(bansalanGps, 1),
  },
  {
    id: "m-marcelo-tenebro",
    areaId: "area-bansalan",
    fullName: "Marcelo G. Tenebro",
    church: "Buenavista Alliance Church",
    address: "Rodero, Makilala, North Cotabato",
    missionStatement: "My mission is to see people spiritually transformed by God through His word.",
    ministryFocus: "Discipleship",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    municipality: "Makilala",
    gps: offset(bansalanGps, 2),
  },
  {
    id: "m-alberto-badal-jr",
    areaId: "area-bansalan",
    fullName: "Alberto Badal Jr.",
    church: "Onion Alliance Church Planting Ministry",
    address: "Digos City, Davao del Sur",
    missionStatement:
      "I envision to see mature baptized individuals joyfully worshiping God for His glory and honor.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Digos City",
    gps: offset(bansalanGps, 3),
  },
  {
    id: "m-gilbert-pili",
    areaId: "area-bansalan",
    fullName: "Gilbert M. Pili",
    church: "Mount Nebo Alliance Church Planting",
    address: "Linawan, Bansalan, Davao del Sur",
    missionStatement:
      "My mission is to faithfully reach out more people in my own locality to join in praising and worshipping God for His glory and honor.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Bansalan",
    barangay: "Linawan",
    gps: offset(bansalanGps, 4),
  },
  {
    id: "m-frederick-omo",
    areaId: "area-bansalan",
    fullName: "Frederick P. Omo",
    church: "Lower Disa Alliance Church",
    address: "Anonang, Bansalan, Davao del Sur",
    missionStatement:
      "My mission is to raise spiritually healthy church members passionately, engaging in the ministry of transformation for the glory of God.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Bansalan",
    gps: offset(bansalanGps, 5),
  },
  {
    id: "m-henoven-david",
    areaId: "area-bansalan",
    fullName: "Henoven B. David",
    church: "Eman Church Planting Ministry",
    address: "Linawan, Bansalan, Davao del Sur",
    missionStatement:
      "My mission in life is to give good impact in the community through sharing His word for the glory of the living God.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Bansalan",
    barangay: "Linawan",
    gps: offset(bansalanGps, 6),
  },
  {
    id: "m-ronel-felecella",
    areaId: "area-bansalan",
    fullName: "Ronel L. Felecella",
    church: "Marawer Church Planting Ministry",
    address: "Culan, Sibulan, Sta. Cruz, Davao del Sur",
    missionStatement:
      "My mission is to establish Bible founded church planting ministry in my own locality for the glory of God.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Sta. Cruz",
    gps: offset(bansalanGps, 7),
  },

  // ── Digos Area ──────────────────────────────────────────────
  {
    id: "m-lazaro-bangcas",
    areaId: "area-digos",
    fullName: "Lazaro E. Bangcas",
    church: "Sulop Church Planting Ministry",
    address: "Poblacion, Sulop, Davao del Sur",
    missionStatement:
      "To obey the great commission of Jesus Christ, to evangelize, to conduct Bible study, to follow up by prayer and encouragement, and to establish congregation.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Regional Leadership",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Sulop",
    gps: offset(digosGps, 0),
  },
  {
    id: "m-phemarjohn-bontia",
    areaId: "area-digos",
    fullName: "Phemarjohn R. Bontia",
    church: "Sinaragan Church Planting Ministry",
    address: "Brgy. Colorado, Digos City, Davao del Sur",
    missionStatement:
      "To proclaim the Gospel, make disciples, and plant Christ-centered churches that transform communities.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Digos City",
    barangay: "Colorado",
    gps: offset(digosGps, 1),
  },
  {
    id: "m-gary-david-sr",
    areaId: "area-digos",
    fullName: "Gary B. David Sr.",
    church: "Sinawilan Church Planting",
    address: "Tres de Mayo, Digos City, Davao del Sur",
    missionStatement:
      "Planting churches to reach every community with the Gospel that becomes centers of worship, discipleship, and outreach for the glory of God.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Digos City",
    gps: offset(digosGps, 2),
  },
  {
    id: "m-ben-jabez-baloy",
    areaId: "area-digos",
    fullName: "Ben Jabez O. Baloy",
    church: "Sulop Alliance Gospel Church",
    address: "Sulop, Davao del Sur",
    missionStatement:
      "To devote ourselves to prayer and fasting, and to conduct evangelistic crusades that spread the Gospel.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Sulop",
    gps: offset(digosGps, 3),
  },
  {
    id: "m-rico-masaglang",
    areaId: "area-digos",
    fullName: "Rico T. Masaglang",
    church: "Sulop Alliance Gospel Church",
    address: "Sulop, Davao del Sur",
    missionStatement:
      "To encourage people to gather together, reach out to others, prayer and fasting, and conduct evangelistic crusades.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Sulop",
    gps: offset(digosGps, 4),
  },
  {
    id: "m-jessie-dial",
    areaId: "area-digos",
    fullName: "Jessie B. Dial",
    church: "Guihing Alliance Gospel Church / Sinayawan Church Planting",
    address: "Guihing, Hagonoy, Davao del Sur",
    missionStatement:
      "To aggressively proclaim the Gospel by planting Christ-centered churches, making faithful disciples, and reaching every community with the love and truth of Jesus Christ, all for the glory of God.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Hagonoy",
    barangay: "Guihing",
    gps: offset(digosGps, 5),
  },
  {
    id: "m-saljohn-sobredilla",
    areaId: "area-digos",
    fullName: "Saljohn N. Sobredilla",
    church: "Dulangan Alliance Church",
    address: "Dulangan, Digos City, Davao del Sur",
    missionStatement:
      "To show the love of God, through reaching people into holistic activities, bringing them to fellowship, and teaching them to become accountable and reliable believers of the Lord Jesus Christ, and empowered to the task of making disciples that everyone will become dedicated to worship God and beyond for His glory.",
    ministryFocus: "Discipleship",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "Davao Region (Region XI)",
    province: "Davao del Sur",
    municipality: "Digos City",
    barangay: "Dulangan",
    gps: offset(digosGps, 6),
  },
  {
    id: "m-marty-nellas",
    areaId: "area-digos",
    fullName: "Marty B. Nellas",
    church: "SBC, Matanao, Davao del Sur",
    address: "Kisante, Makilala, Cotabato",
    missionStatement:
      "To glorify God by loving Him wholeheartedly, sharing the Gospel of Jesus Christ, serving others with compassion and integrity, making faithful disciples, and living a life that reflects Christ in every word and action.",
    ministryFocus: "Discipleship",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    municipality: "Makilala",
    gps: offset(digosGps, 7),
  },

  // ── Arakan Area ─────────────────────────────────────────────
  {
    id: "m-ronilo-dalisay",
    areaId: "area-arakan",
    fullName: "Ronilo E. Dalisay",
    church: "Marang Alliance Fellowship Center",
    address: "Sarayan, Matalam, Cotabato",
    missionStatement:
      "My mission is to continue to proclaim the word of God and lead people to Christ, plant and establish churches for the glory of God.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Regional Leadership",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    municipality: "Matalam",
    gps: offset(arakanGps, 0),
  },
  {
    id: "m-romel-gay",
    areaId: "area-arakan",
    fullName: "Romel B. Gay",
    church: "Natayukan Alliance Church",
    address: "Natayukan, Balete, Magpet, Cotabato",
    missionStatement:
      "My mission is to glorify God by faithfully serving Him and His people through preaching His word, living a Christ-centered life, making disciples, encouraging believers, and sharing the gospel with those who do not yet know Christ. I am committed to serving with humility, integrity, love, and dependence on the Holy Spirit so that God alone receives the glory and lives are transformed through Jesus Christ.",
    ministryFocus: "Discipleship",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    municipality: "Magpet",
    gps: offset(arakanGps, 1),
  },
  {
    id: "m-ariel-engay",
    areaId: "area-arakan",
    fullName: "Ariel A. Engay",
    church: "Bagumbayan Alliance Church",
    address: "Sitio Tungaw, Temporan, Magpet, Cotabato",
    missionStatement:
      "Transforming lives and renewing society through spiritual discipleship and practical community care through Jesus Christ.",
    ministryFocus: "Discipleship",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    municipality: "Magpet",
    gps: offset(arakanGps, 2),
  },
  {
    id: "m-artemio-allah",
    areaId: "area-arakan",
    fullName: "Artemio A. Allah",
    church: "Magyao Alliance Church",
    address: "Upper Spring, Manobisa, Magpet, Cotabato",
    missionStatement:
      "Nakatutok sa pagmamahal sa Diyos at pagmamahal sa kapwa sa pamamagitan ng paglilingkod, pananalangin, at pagbabahagi ng magandang balita sa iba.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    municipality: "Magpet",
    gps: offset(arakanGps, 3),
  },
  {
    id: "m-dino-dayon",
    areaId: "area-arakan",
    fullName: "Dino B. Dayon",
    church: "Arakan Alliance Church",
    address: "Poblacion, Arakan, Cotabato",
    missionStatement:
      "Mahalin ang Diyos at kapwa, lumago bilang alagad ni Hesu Cristo, at humayo upang ipangaral ang Ebanghelyo.",
    ministryFocus: "Discipleship",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    municipality: "Arakan",
    gps: offset(arakanGps, 4),
  },
  {
    id: "m-marvin-jon-gutierrez",
    areaId: "area-arakan",
    fullName: "Marvin Jon F. Gutierrez",
    church: "Balete Alliance Church",
    address: "Purok 7-A, Malatad, Antipas, Cotabato",
    missionStatement:
      "I exist to share the love and spread the good news of Jesus Christ in holistic approach to service, addressing the multifaceted needs of those I serve for the glory of God.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    municipality: "Antipas",
    gps: offset(arakanGps, 5),
  },
  {
    id: "m-edgardo-semenilla",
    areaId: "area-arakan",
    fullName: "Edgardo S. Semenilla",
    church: "Anapolon Fellowship Center",
    address: "Anapolon, Arakan, Cotabato",
    missionStatement: "Reaching the next generation with the gospel.",
    ministryFocus: "Youth Ministry",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    municipality: "Arakan",
    gps: offset(arakanGps, 6),
  },
  {
    id: "m-gabriel-damiog",
    areaId: "area-arakan",
    fullName: "Gabriel A. Damiog",
    church: "Sitio Gumay Alliance Church",
    address: "Lower Camutan, Antipas, Cotabato",
    missionStatement:
      "Ang akong mission para sa buluhaton sa Diyos. Akong iwali ang pulong sa Ginoo ngadto sa mga katawhan uban sa mainiton ug mapinadayunon alang sa kaluwasan sa mga katawhan sa Diyos.",
    ministryFocus: "Church Planting",
    status: "Active",
    journeyStage: "Church Planting",
    country: "Philippines",
    region: "SOCCSKSARGEN (Region XII)",
    province: "Cotabato",
    municipality: "Antipas",
    gps: offset(arakanGps, 7),
  },
];

export const seedReports: MinistryReport[] = [];
export const seedPrayer: PrayerRequest[] = [];

// ============================================================
// Runtime store — merges seed with browser-persisted additions.
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
  for (const e of extras) map.set(e.id, e);
  return Array.from(map.values());
}

export function allPhases(): Phase[] {
  return merge(seedPhases, readStore().phases);
}
export function allAreas(): Area[] {
  return merge(seedAreas, readStore().areas);
}
export function allMissionaries(): Missionary[] {
  return merge(seedMissionaries, readStore().missionaries);
}

export const phases: Phase[] = allPhases();
export const areas: Area[] = allAreas();
export const missionaries: Missionary[] = allMissionaries();

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
  if (payload.phases?.length) for (const p of payload.phases) s.phases = s.phases.filter((x) => x.id !== p.id).concat(p);
  if (payload.areas?.length) for (const a of payload.areas) s.areas = s.areas.filter((x) => x.id !== a.id).concat(a);
  if (payload.missionaries?.length) for (const m of payload.missionaries) s.missionaries = s.missionaries.filter((x) => x.id !== m.id).concat(m);
  writeStore(s);
}

export function exportPayload(): Store {
  return { phases: allPhases(), areas: allAreas(), missionaries: allMissionaries() };
}

export function getPhase(id: string) { return allPhases().find((p) => p.id === id); }
export function getArea(id: string) { return allAreas().find((a) => a.id === id); }
export function getMissionary(id: string) { return allMissionaries().find((m) => m.id === id); }
export function areasByPhase(phaseId: string) { return allAreas().filter((a) => a.phaseId === phaseId); }
export function missionariesByArea(areaId: string) { return allMissionaries().filter((m) => m.areaId === areaId); }

export const reports: MinistryReport[] = seedReports;
export const prayerRequests: PrayerRequest[] = seedPrayer;
export function reportsByMissionary(id: string) { return reports.filter((r) => r.missionaryId === id); }
export function prayerByMissionary(id: string) { return prayerRequests.filter((p) => p.missionaryId === id); }

export const regions = Array.from(new Set(allMissionaries().map((m) => m.region).filter(Boolean) as string[]));
export const provinces = Array.from(new Set(allMissionaries().map((m) => m.province).filter(Boolean) as string[]));

export const missionStats = {
  get totalMissionaries() { return allMissionaries().length; },
  get totalPhases() { return allPhases().length; },
  get totalAreas() { return allAreas().length; },
  get totalRegions() { return new Set(allMissionaries().map((m) => m.region).filter(Boolean)).size; },
  get totalProvinces() { return new Set(allMissionaries().map((m) => m.province).filter(Boolean)).size; },
  get totalChurches() { return new Set(allMissionaries().map((m) => m.church)).size; },
  get totalActive() { return allMissionaries().filter((m) => m.status === "Active").length; },
  get totalPrayerRequests() { return prayerRequests.filter((p) => !p.answered).length; },
  get totalReports() { return reports.length; },
  get totalChurchesPlanted() { return allMissionaries().reduce((s, m) => s + (m.churchesPlanted ?? 0), 0); },
  get totalBaptisms() { return allMissionaries().reduce((s, m) => s + (m.baptisms ?? 0), 0); },
  get totalLeadersTrained() { return allMissionaries().reduce((s, m) => s + (m.leadersTrained ?? 0), 0); },
};

export function missionariesByPhaseCount() {
  return allPhases().map((p) => ({
    name: p.name,
    value: areasByPhase(p.id).reduce((s, a) => s + missionariesByArea(a.id).length, 0),
  }));
}
export function missionariesByAreaCount() {
  return allAreas().map((a) => ({ name: a.name, value: missionariesByArea(a.id).length }));
}
export function supportStatus() {
  return allMissionaries().filter((m) => m.monthlySupportNeeded).map((m) => {
    const needed = m.monthlySupportNeeded ?? 0;
    const received = m.supportReceived ?? 0;
    return { name: m.fullName, received, needed, percent: needed ? Math.round((received / needed) * 100) : 0 };
  });
}
