// Seed data for the Cross-Cultural Mission Management prototype.
// All data is in-memory; no backend yet.

export type MissionPhase =
  | "Candidate"
  | "Training"
  | "Internship"
  | "Commissioned"
  | "Church Planting"
  | "Multiplication"
  | "Regional Leadership"
  | "Senior Missionary"
  | "Retired";

export type Status = "Active" | "On Leave" | "Retired" | "Transferred" | "Completed";

export interface Missionary {
  id: string;
  fullName: string;
  photo: string;
  cover: string;
  age: number;
  gender: "Male" | "Female";
  birthday: string;
  anniversary?: string;
  spouse?: string;
  children: string[];
  phone: string;
  email: string;
  facebook?: string;
  currentAssignment: string;
  churchName: string;
  missionField: string;
  country: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  address: string;
  gps: [number, number];
  dateSent: string;
  sendingChurch: string;
  sendingPastor: string;
  missionAgency: string;
  batch: string;
  phase: MissionPhase;
  status: Status;
  missionStatement: string;
  vision: string;
  lifeVerse: string;
  bio: string;
  education: string[];
  bibleSchool: string;
  languages: string[];
  skills: string[];
  ministryFocus: string;
  ethnicGroup: string;
  peopleGroup: string;
  religiousBackground: string;
  populationReached: number;
  monthlySupportNeeded: number;
  supportReceived: number;
  prayerRequests: string[];
  answeredPrayers: string[];
  needs: string[];
  churchesPlanted: number;
  baptisms: number;
  bibleStudies: number;
  leadersTrained: number;
  gallery: { url: string; caption: string; album: string }[];
  timeline: { date: string; title: string; description: string }[];
}

export interface MinistryReport {
  id: string;
  missionaryId: string;
  title: string;
  date: string;
  summary: string;
  fullReport: string;
  salvations: number;
  baptisms: number;
  bibleStudies: number;
  attendance: number;
  newBelievers: number;
  leadersTrained: number;
  prayerRequests: string[];
  praiseReports: string[];
  challenges: string[];
  photos: string[];
}

export interface PrayerRequest {
  id: string;
  missionaryId: string;
  title: string;
  detail: string;
  date: string;
  urgent: boolean;
  answered: boolean;
}

const photo = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=800&q=70`;

const cover = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1600&q=70`;

// Curated Unsplash IDs of warm portraits & landscape photography.
const portraits = [
  "1544005313-94ddf0286df2",
  "1507003211169-0a1dd7228f2d",
  "1531123897727-8f129e1688ce",
  "1519085360753-af0119f7cbe7",
  "1552058544-f2b08422138a",
  "1500648767791-00dcc994a43e",
  "1607746882042-944635dfe10e",
  "1580489944761-15a19d654956",
  "1506794778202-cad84cf45f1d",
  "1494790108377-be9c29b29330",
  "1521119989659-a83eee488004",
  "1508214751196-bcfd4ca60f91",
];

const covers = [
  "1500534314209-a25ddb2bd429", // rice terraces
  "1470071459604-3b5ec3a7fe05", // mountains
  "1519681393784-d120267933ba", // fields
  "1506905925346-21bda4d32df4", // landscape
  "1441974231531-c6227db76b6e", // forest
  "1476514525535-07fb3b4ae5f1",
];

export const missionaries: Missionary[] = [
  {
    id: "ptr-santos",
    fullName: "Ptr. Elias Santos",
    photo: photo(portraits[0]),
    cover: cover(covers[0]),
    age: 42,
    gender: "Male",
    birthday: "1983-03-14",
    anniversary: "2008-06-21",
    spouse: "Maribel Santos",
    children: ["Joash (12)", "Hannah (9)", "Caleb (5)"],
    phone: "+63 917 555 1201",
    email: "elias.santos@mission.org",
    facebook: "eliassantosph",
    currentAssignment: "Church Planter",
    churchName: "Grace Bible Church of Banaue",
    missionField: "Ifugao Highlands",
    country: "Philippines",
    region: "Cordillera Administrative Region",
    province: "Ifugao",
    municipality: "Banaue",
    barangay: "Batad",
    address: "Sitio Batad, Banaue, Ifugao 3601",
    gps: [16.9296, 121.0576],
    dateSent: "2015-05-10",
    sendingChurch: "Christ Community Church, Quezon City",
    sendingPastor: "Ptr. Ronaldo Cruz",
    missionAgency: "Philippine Missions Association",
    batch: "Batch 12",
    phase: "Multiplication",
    status: "Active",
    missionStatement:
      "To make disciples among the Ifugao who make disciples until every rice terrace echoes with worship.",
    vision: "Ten reproducing churches across the Cordillera by 2030.",
    lifeVerse: "Romans 10:14-15",
    bio: "Elias grew up in Manila and surrendered to full-time missions at age 22 after a short-term trip to Batad. He and Maribel have served the Ifugao people for over a decade, learning the language and planting churches in remote sitios.",
    education: ["BS Civil Engineering, PUP", "M.Div, Asian Theological Seminary"],
    bibleSchool: "Asian Theological Seminary",
    languages: ["Tagalog", "English", "Ifugao (Tuwali)"],
    skills: ["Bible teaching", "Church planting", "Trekking", "Basic construction"],
    ministryFocus: "Church Planting",
    ethnicGroup: "Ifugao",
    peopleGroup: "Tuwali Ifugao",
    religiousBackground: "Animistic / Folk Catholic",
    populationReached: 3200,
    monthlySupportNeeded: 45000,
    supportReceived: 38000,
    prayerRequests: [
      "Salvation of Barangay Captain Domingo",
      "Safe travel during rainy season landslides",
      "Wisdom raising up two local elders",
    ],
    answeredPrayers: [
      "New believer Auntie Rosa was baptized in July",
      "Provision for the church roof completed in August",
    ],
    needs: ["Solar panel for outreach chapel", "Children's ministry curriculum in Ifugao"],
    churchesPlanted: 3,
    baptisms: 47,
    bibleStudies: 12,
    leadersTrained: 6,
    gallery: [
      { url: cover(covers[0]), caption: "Sunday worship in Batad", album: "Church Life" },
      { url: cover(covers[2]), caption: "Baptism at the river", album: "Baptisms" },
      { url: cover(covers[4]), caption: "Trekking to the outreach sitio", album: "Mission Trips" },
    ],
    timeline: [
      { date: "2005-08-01", title: "Called to Ministry", description: "Surrendered during Urbana youth conference." },
      { date: "2011-04-30", title: "Seminary Graduation", description: "Graduated M.Div from ATS." },
      { date: "2015-05-10", title: "Commissioned", description: "Sent by CCC Quezon City to Ifugao." },
      { date: "2017-11-12", title: "First Church Planted", description: "Grace Bible Church of Banaue organized." },
      { date: "2022-02-06", title: "Second Church Planted", description: "Sitio Cambulo outreach became a local church." },
      { date: "2025-01-15", title: "Third Church Planted", description: "Hapao Bible Fellowship organized." },
    ],
  },
  {
    id: "ptr-david",
    fullName: "Ptr. Nathaniel David",
    photo: photo(portraits[1]),
    cover: cover(covers[1]),
    age: 36,
    gender: "Male",
    birthday: "1989-11-02",
    anniversary: "2014-02-14",
    spouse: "Grace David",
    children: ["Zoe (8)", "Levi (6)"],
    phone: "+63 917 555 2144",
    email: "nathan.david@mission.org",
    currentAssignment: "Church Planter",
    churchName: "Living Hope Chapel — Palawan",
    missionField: "Palawan Batak Tribe",
    country: "Philippines",
    region: "MIMAROPA",
    province: "Palawan",
    municipality: "Puerto Princesa",
    barangay: "Tanabag",
    address: "Sitio Kalakwasan, Tanabag, Puerto Princesa",
    gps: [10.0731, 118.9502],
    dateSent: "2018-03-01",
    sendingChurch: "Higher Rock Christian Church",
    sendingPastor: "Ptr. Peter Tan",
    missionAgency: "Philippine Missions Association",
    batch: "Batch 15",
    phase: "Church Planting",
    status: "Active",
    missionStatement: "Bringing the gospel to the last unreached Batak villages of Palawan.",
    vision: "A gospel witness in every Batak sitio.",
    lifeVerse: "Matthew 28:19-20",
    bio: "Nathan and Grace serve among the Batak, one of the smallest indigenous groups in the Philippines. They live in Tanabag and hike 4-6 hours to reach mountain villages.",
    education: ["BA Theology, PBTS"],
    bibleSchool: "Philippine Baptist Theological Seminary",
    languages: ["Tagalog", "English", "Cuyunon", "Batak (learning)"],
    skills: ["Language learning", "Trekking", "Community health"],
    ministryFocus: "Tribal Ministry",
    ethnicGroup: "Batak",
    peopleGroup: "Batak of Palawan",
    religiousBackground: "Animistic",
    populationReached: 480,
    monthlySupportNeeded: 40000,
    supportReceived: 40000,
    prayerRequests: [
      "First Batak believer to be baptized",
      "Health and stamina for mountain treks",
    ],
    answeredPrayers: ["Full monthly support since March 2024"],
    needs: ["Water filtration system for Kalakwasan", "Literacy primers"],
    churchesPlanted: 1,
    baptisms: 9,
    bibleStudies: 5,
    leadersTrained: 2,
    gallery: [
      { url: cover(covers[1]), caption: "Trail to Kalakwasan", album: "Mission Trips" },
      { url: cover(covers[5]), caption: "First Sunday gathering", album: "Church Life" },
    ],
    timeline: [
      { date: "2010-06-01", title: "Called to Ministry", description: "Youth camp in Palawan." },
      { date: "2014-02-14", title: "Marriage", description: "Married Grace." },
      { date: "2018-03-01", title: "Commissioned", description: "Sent to Palawan Batak." },
      { date: "2023-05-20", title: "First Church Plant", description: "Living Hope Chapel organized." },
    ],
  },
  {
    id: "ptr-lomboy",
    fullName: "Ptr. Ruel Lomboy",
    photo: photo(portraits[2]),
    cover: cover(covers[2]),
    age: 51,
    gender: "Male",
    birthday: "1974-07-25",
    anniversary: "1998-12-05",
    spouse: "Cora Lomboy",
    children: ["Miriam (24)", "Isaiah (21)", "Ruth (17)"],
    phone: "+63 917 555 3311",
    email: "ruel.lomboy@mission.org",
    currentAssignment: "Regional Coordinator — Mindanao",
    churchName: "Cotabato Grace Fellowship",
    missionField: "Maguindanao",
    country: "Philippines",
    region: "BARMM",
    province: "Maguindanao del Sur",
    municipality: "Datu Odin Sinsuat",
    barangay: "Awang",
    address: "Awang, Datu Odin Sinsuat, Maguindanao",
    gps: [7.1653, 124.2072],
    dateSent: "2003-09-14",
    sendingChurch: "Bread of Life Baguio",
    sendingPastor: "Ptr. Samuel Aquino",
    missionAgency: "Great Commission Missionary Movement",
    batch: "Batch 5",
    phase: "Regional Leadership",
    status: "Active",
    missionStatement: "Faithful presence and gospel proclamation among Muslim-background friends.",
    vision: "A Filipino-Muslim believer movement led by local disciples.",
    lifeVerse: "Isaiah 6:8",
    bio: "Ruel has spent 22 years in Mindanao, planting 5 churches and now overseeing 14 missionaries across the region.",
    education: ["M.A. Intercultural Studies, ATS"],
    bibleSchool: "Asian Theological Seminary",
    languages: ["Tagalog", "English", "Maguindanao", "Cebuano"],
    skills: ["Coaching", "Peacemaking", "Radio ministry"],
    ministryFocus: "Cross-Cultural Ministry",
    ethnicGroup: "Maguindanao",
    peopleGroup: "Maguindanao Muslims",
    religiousBackground: "Islam",
    populationReached: 15000,
    monthlySupportNeeded: 55000,
    supportReceived: 52000,
    prayerRequests: [
      "Peace and open doors after recent clashes",
      "Health for Cora recovering from surgery",
    ],
    answeredPrayers: ["3 Maguindanao MBBs baptized in secret this year"],
    needs: ["Fuel budget for regional visits", "Radio equipment upgrade"],
    churchesPlanted: 5,
    baptisms: 112,
    bibleStudies: 20,
    leadersTrained: 18,
    gallery: [
      { url: cover(covers[3]), caption: "Regional leaders gathering", album: "Leadership" },
    ],
    timeline: [
      { date: "1996-05-20", title: "Called to Ministry", description: "During revival week in Baguio." },
      { date: "2003-09-14", title: "Commissioned", description: "Sent to Cotabato." },
      { date: "2007-06-10", title: "First Church Planted", description: "Awang Fellowship organized." },
      { date: "2019-02-01", title: "Regional Coordinator", description: "Oversight of Mindanao team." },
    ],
  },
  {
    id: "sis-mendoza",
    fullName: "Sis. Angeline Mendoza",
    photo: photo(portraits[3]),
    cover: cover(covers[3]),
    age: 29,
    gender: "Female",
    birthday: "1996-09-18",
    children: [],
    phone: "+63 917 555 4092",
    email: "angeline.mendoza@mission.org",
    currentAssignment: "Children's Ministry Missionary",
    churchName: "Hope Church of Samar",
    missionField: "Eastern Samar",
    country: "Philippines",
    region: "Eastern Visayas",
    province: "Eastern Samar",
    municipality: "Borongan",
    barangay: "Sabang",
    address: "Sabang, Borongan City, Eastern Samar",
    gps: [11.6081, 125.4319],
    dateSent: "2022-06-01",
    sendingChurch: "Victory Fort Bonifacio",
    sendingPastor: "Ptr. Manny Carlos",
    missionAgency: "Victory Missions",
    batch: "Batch 18",
    phase: "Commissioned",
    status: "Active",
    missionStatement: "Reaching children and families with the love of Christ.",
    vision: "A children's discipleship movement in every barangay of Samar.",
    lifeVerse: "Mark 10:14",
    bio: "Angeline serves single as a children's missionary, running weekly Kids Church for over 200 kids across three villages.",
    education: ["BS Elementary Education, UP"],
    bibleSchool: "School of Christian Ministry (Victory)",
    languages: ["Tagalog", "English", "Waray"],
    skills: ["Children's ministry", "Music", "Storytelling"],
    ministryFocus: "Children's Ministry",
    ethnicGroup: "Waray",
    peopleGroup: "Waray-Waray",
    religiousBackground: "Roman Catholic",
    populationReached: 850,
    monthlySupportNeeded: 22000,
    supportReceived: 15000,
    prayerRequests: [
      "Additional co-worker for Kids Church expansion",
      "Provision for VBS materials",
    ],
    answeredPrayers: ["45 kids professed faith at last VBS"],
    needs: ["Puppet ministry kit", "Portable sound system"],
    churchesPlanted: 0,
    baptisms: 5,
    bibleStudies: 8,
    leadersTrained: 4,
    gallery: [
      { url: cover(covers[3]), caption: "Sunday Kids Church", album: "Children Ministry" },
    ],
    timeline: [
      { date: "2018-04-01", title: "Called to Ministry", description: "During campus retreat." },
      { date: "2022-06-01", title: "Commissioned", description: "Sent to Eastern Samar." },
    ],
  },
  {
    id: "ptr-torres",
    fullName: "Ptr. Marcus Torres",
    photo: photo(portraits[4]),
    cover: cover(covers[4]),
    age: 45,
    gender: "Male",
    birthday: "1980-01-08",
    anniversary: "2005-11-19",
    spouse: "Jenny Torres",
    children: ["Elijah (18)", "Sarah (15)", "Josiah (11)"],
    phone: "+63 917 555 5510",
    email: "marcus.torres@mission.org",
    currentAssignment: "Church Planter",
    churchName: "New Life Christian Church",
    missionField: "Zamboanga Peninsula",
    country: "Philippines",
    region: "Zamboanga Peninsula",
    province: "Zamboanga del Sur",
    municipality: "Pagadian",
    barangay: "Balangasan",
    address: "Balangasan District, Pagadian City",
    gps: [7.8257, 123.4368],
    dateSent: "2010-08-20",
    sendingChurch: "Christ Community Church, Quezon City",
    sendingPastor: "Ptr. Ronaldo Cruz",
    missionAgency: "Philippine Missions Association",
    batch: "Batch 8",
    phase: "Multiplication",
    status: "Active",
    missionStatement: "Planting Christ-centered churches in Zamboanga's coastal barangays.",
    vision: "A daughter church every 3 years.",
    lifeVerse: "Acts 1:8",
    bio: "Marcus and Jenny planted their first church in 2013 and have since multiplied into two additional congregations.",
    education: ["M.Div, PBTS"],
    bibleSchool: "PBTS",
    languages: ["Tagalog", "English", "Chavacano", "Cebuano"],
    skills: ["Preaching", "Discipleship", "Boat handling"],
    ministryFocus: "Church Planting",
    ethnicGroup: "Chavacano",
    peopleGroup: "Zamboangueños",
    religiousBackground: "Roman Catholic",
    populationReached: 4200,
    monthlySupportNeeded: 42000,
    supportReceived: 42000,
    prayerRequests: ["Wisdom raising up next generation of leaders"],
    answeredPrayers: ["New church building dedicated in Balangasan"],
    needs: ["Motorcycle for outreach to farthest barangay"],
    churchesPlanted: 3,
    baptisms: 78,
    bibleStudies: 15,
    leadersTrained: 9,
    gallery: [{ url: cover(covers[4]), caption: "Church dedication", album: "Church Life" }],
    timeline: [
      { date: "2010-08-20", title: "Commissioned", description: "Sent to Zamboanga." },
      { date: "2013-01-06", title: "First Church Planted", description: "New Life Christian Church organized." },
    ],
  },
  {
    id: "ptr-aquino",
    fullName: "Ptr. Jethro Aquino",
    photo: photo(portraits[5]),
    cover: cover(covers[5]),
    age: 33,
    gender: "Male",
    birthday: "1992-04-30",
    anniversary: "2019-05-04",
    spouse: "Danica Aquino",
    children: ["Titus (3)"],
    phone: "+63 917 555 6620",
    email: "jethro.aquino@mission.org",
    currentAssignment: "Campus Missionary",
    churchName: "University Bible Fellowship — Iloilo",
    missionField: "Iloilo Universities",
    country: "Philippines",
    region: "Western Visayas",
    province: "Iloilo",
    municipality: "Iloilo City",
    barangay: "Molo",
    address: "Molo District, Iloilo City",
    gps: [10.7078, 122.5427],
    dateSent: "2020-01-15",
    sendingChurch: "Cornerstone Iloilo",
    sendingPastor: "Ptr. Jerome Alcantara",
    missionAgency: "Great Commission Missionary Movement",
    batch: "Batch 17",
    phase: "Internship",
    status: "Active",
    missionStatement: "Reaching university students with the gospel.",
    vision: "A gospel movement in every Iloilo campus.",
    lifeVerse: "2 Timothy 2:2",
    bio: "Jethro leads campus Bible studies across UPV, WVSU, and Central Philippine University.",
    education: ["BS Psychology, UPV"],
    bibleSchool: "GCMM Institute",
    languages: ["Tagalog", "English", "Hiligaynon"],
    skills: ["Campus ministry", "Small-group facilitation"],
    ministryFocus: "Campus Ministry",
    ethnicGroup: "Ilonggo",
    peopleGroup: "Hiligaynon",
    religiousBackground: "Roman Catholic",
    populationReached: 620,
    monthlySupportNeeded: 30000,
    supportReceived: 22000,
    prayerRequests: [
      "New batch of student leaders",
      "Provision for family expenses",
    ],
    answeredPrayers: ["12 students baptized this school year"],
    needs: ["Discipleship books for new believers"],
    churchesPlanted: 0,
    baptisms: 24,
    bibleStudies: 10,
    leadersTrained: 5,
    gallery: [],
    timeline: [
      { date: "2020-01-15", title: "Commissioned", description: "Sent to Iloilo campuses." },
    ],
  },
];

export const reports: MinistryReport[] = [
  {
    id: "r1",
    missionaryId: "ptr-santos",
    title: "October 2025 — Batad Church Update",
    date: "2025-10-30",
    summary:
      "Two new families started attending Sunday worship. Roof project completed on time.",
    fullReport:
      "This month the Lord opened doors in the neighboring sitio of Cambulo. Two families whom we've been visiting for over a year finally joined our Sunday gathering. We also completed the roof of the outreach chapel just before typhoon season began...",
    salvations: 4,
    baptisms: 2,
    bibleStudies: 3,
    attendance: 62,
    newBelievers: 4,
    leadersTrained: 1,
    prayerRequests: ["Wisdom in choosing elders", "Health for Maribel"],
    praiseReports: ["Roof project completed", "New families visiting"],
    challenges: ["Long rainy season limits outreach travel"],
    photos: [cover(covers[0])],
  },
  {
    id: "r2",
    missionaryId: "ptr-david",
    title: "Q3 Report — Batak Mountain Villages",
    date: "2025-09-28",
    summary: "First baptism candidate identified. Language learning progressing.",
    fullReport:
      "Our elder brother Kuya Danilo has been meeting weekly and has expressed his desire to follow Christ publicly. We are prayerfully preparing for a baptism...",
    salvations: 2,
    baptisms: 0,
    bibleStudies: 4,
    attendance: 18,
    newBelievers: 2,
    leadersTrained: 0,
    prayerRequests: ["Kuya Danilo's baptism", "Safety on trail"],
    praiseReports: ["Language milestones reached"],
    challenges: ["Difficult trail conditions"],
    photos: [cover(covers[1])],
  },
  {
    id: "r3",
    missionaryId: "ptr-lomboy",
    title: "September Regional Overview — Mindanao",
    date: "2025-10-05",
    summary: "14 missionaries reporting. 3 baptisms. Peace-building ministry gaining traction.",
    fullReport: "Across our Mindanao team of 14 missionaries...",
    salvations: 22,
    baptisms: 3,
    bibleStudies: 34,
    attendance: 410,
    newBelievers: 22,
    leadersTrained: 8,
    prayerRequests: ["Continued peace in Maguindanao"],
    praiseReports: ["3 MBB baptisms"],
    challenges: ["Political tensions"],
    photos: [],
  },
  {
    id: "r4",
    missionaryId: "sis-mendoza",
    title: "Kids Church Growth Report",
    date: "2025-10-12",
    summary: "Weekly attendance reached 220 children across 3 villages.",
    fullReport: "God is doing amazing things among the children of Sabang...",
    salvations: 18,
    baptisms: 0,
    bibleStudies: 6,
    attendance: 220,
    newBelievers: 18,
    leadersTrained: 3,
    prayerRequests: ["More kids ministry volunteers"],
    praiseReports: ["220 children reached weekly"],
    challenges: ["Materials budget stretched thin"],
    photos: [],
  },
];

export const prayerRequests: PrayerRequest[] = [
  {
    id: "p1",
    missionaryId: "ptr-santos",
    title: "Salvation of Barangay Captain Domingo",
    detail: "Please pray for Captain Domingo who has been attending Bible studies for 3 months.",
    date: "2025-10-01",
    urgent: false,
    answered: false,
  },
  {
    id: "p2",
    missionaryId: "ptr-david",
    title: "Kuya Danilo's baptism",
    detail: "First Batak believer preparing for baptism next month.",
    date: "2025-10-15",
    urgent: true,
    answered: false,
  },
  {
    id: "p3",
    missionaryId: "ptr-lomboy",
    title: "Cora's recovery from surgery",
    detail: "Cora had a successful surgery. Please pray for full recovery.",
    date: "2025-09-20",
    urgent: true,
    answered: false,
  },
  {
    id: "p4",
    missionaryId: "sis-mendoza",
    title: "Additional Kids Church volunteers",
    detail: "Need 3 more consistent volunteers to keep growth sustainable.",
    date: "2025-10-08",
    urgent: false,
    answered: false,
  },
  {
    id: "p5",
    missionaryId: "ptr-torres",
    title: "New Life daughter church",
    detail: "Praying about launching a daughter church in Aurora, Zamboanga.",
    date: "2025-09-30",
    urgent: false,
    answered: false,
  },
  {
    id: "p6",
    missionaryId: "ptr-santos",
    title: "Provision for chapel roof",
    detail: "Answered! Roof completed in August with just enough funds.",
    date: "2025-08-20",
    urgent: false,
    answered: true,
  },
];

// ---------- Aggregates for the dashboard ----------

export const regions = Array.from(new Set(missionaries.map((m) => m.region)));
export const provinces = Array.from(new Set(missionaries.map((m) => m.province)));
export const phases: MissionPhase[] = [
  "Candidate",
  "Training",
  "Internship",
  "Commissioned",
  "Church Planting",
  "Multiplication",
  "Regional Leadership",
  "Senior Missionary",
  "Retired",
];

export const missionStats = {
  totalMissionaries: missionaries.length,
  totalRegions: regions.length,
  totalProvinces: provinces.length,
  totalChurchesPlanted: missionaries.reduce((s, m) => s + m.churchesPlanted, 0),
  totalActiveFields: new Set(missionaries.filter((m) => m.status === "Active").map((m) => m.missionField)).size,
  totalFamilies: missionaries.filter((m) => m.spouse).length,
  totalPrayerRequests: prayerRequests.filter((p) => !p.answered).length,
  totalReports: reports.length,
  totalBaptisms: missionaries.reduce((s, m) => s + m.baptisms, 0),
  totalBibleStudies: missionaries.reduce((s, m) => s + m.bibleStudies, 0),
  totalLeadersTrained: missionaries.reduce((s, m) => s + m.leadersTrained, 0),
  totalPopulationReached: missionaries.reduce((s, m) => s + m.populationReached, 0),
};

export function missionariesByRegion() {
  const map = new Map<string, number>();
  missionaries.forEach((m) => map.set(m.region, (map.get(m.region) ?? 0) + 1));
  return Array.from(map, ([name, value]) => ({ name, value }));
}

export function missionariesByPhase() {
  const map = new Map<string, number>();
  missionaries.forEach((m) => map.set(m.phase, (map.get(m.phase) ?? 0) + 1));
  return Array.from(map, ([name, value]) => ({ name, value }));
}

export function churchesByRegion() {
  const map = new Map<string, number>();
  missionaries.forEach((m) =>
    map.set(m.region, (map.get(m.region) ?? 0) + m.churchesPlanted),
  );
  return Array.from(map, ([name, value]) => ({ name, value }));
}

export function supportStatus() {
  return missionaries.map((m) => ({
    name: m.fullName.replace("Ptr. ", "").replace("Sis. ", ""),
    received: m.supportReceived,
    needed: m.monthlySupportNeeded,
    percent: Math.round((m.supportReceived / m.monthlySupportNeeded) * 100),
  }));
}

export function growthTimeline() {
  // fabricated cumulative growth for the demo
  const points = [
    { year: "2018", missionaries: 12, churches: 3 },
    { year: "2019", missionaries: 15, churches: 5 },
    { year: "2020", missionaries: 18, churches: 7 },
    { year: "2021", missionaries: 22, churches: 9 },
    { year: "2022", missionaries: 26, churches: 11 },
    { year: "2023", missionaries: 30, churches: 13 },
    { year: "2024", missionaries: 34, churches: 15 },
    { year: "2025", missionaries: 38, churches: 18 },
  ];
  return points;
}

export function getMissionary(id: string) {
  return missionaries.find((m) => m.id === id);
}

export function reportsByMissionary(id: string) {
  return reports.filter((r) => r.missionaryId === id);
}

export function prayerByMissionary(id: string) {
  return prayerRequests.filter((p) => p.missionaryId === id);
}
