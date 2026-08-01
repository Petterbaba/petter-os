// Mock-data for petter-os v0.1.
// Strukturen speiler den planlagte Supabase-datamodellen (workouts, sets,
// transactions, accounts, metrics, notes). Når databasen kobles på, byttes
// innmaten i getDashboardData() ut med spørringer – typene og forsiden
// forblir uendret.

export type WorkoutSet = {
  id: string;
  workoutId: string;
  exercise: string;
  setNumber: number;
  weightKg: number;
  reps: number;
};

export type Workout = {
  id: string;
  date: string; // ISO 8601
  name: string;
  durationMin: number;
  sets: WorkoutSet[];
};

export type WeeklyVolume = {
  week: string; // "Uke 24"
  volumeKg: number; // sum av vekt × reps for uken
};

export type Account = {
  id: string;
  name: string;
  valueNok: number;
};

export type PortfolioPoint = {
  date: string; // ISO 8601
  valueNok: number;
};

export type Metric = {
  date: string; // ISO 8601
  weightKg: number;
};

export type Note = {
  id: string;
  date: string; // ISO 8601
  title: string;
  body: string;
};

export type Habit = {
  id: string;
  name: string;
};

// Én rad = vanen ble gjennomført den dagen (speiler habit_entries-tabellen).
export type HabitEntry = {
  habitId: string;
  date: string; // ISO 8601
};

export type DashboardData = {
  sisteOkt: Workout;
  volumtrend: WeeklyVolume[];
  kontoer: Account[];
  portefolje: PortfolioPoint[];
  vekt: Metric[];
  notater: Note[];
  vaner: Habit[];
  vaneOppforinger: HabitEntry[];
  vanePeriode: { fra: string; til: string };
};

const sisteOkt: Workout = {
  id: "w-2026-07-30",
  date: "2026-07-30",
  name: "Underkropp A",
  durationMin: 68,
  sets: [
    { id: "s1", workoutId: "w-2026-07-30", exercise: "Knebøy", setNumber: 1, weightKg: 120, reps: 5 },
    { id: "s2", workoutId: "w-2026-07-30", exercise: "Knebøy", setNumber: 2, weightKg: 130, reps: 5 },
    { id: "s3", workoutId: "w-2026-07-30", exercise: "Knebøy", setNumber: 3, weightKg: 137.5, reps: 4 },
    { id: "s4", workoutId: "w-2026-07-30", exercise: "Markløft", setNumber: 1, weightKg: 150, reps: 5 },
    { id: "s5", workoutId: "w-2026-07-30", exercise: "Markløft", setNumber: 2, weightKg: 162.5, reps: 3 },
    { id: "s6", workoutId: "w-2026-07-30", exercise: "Utfall", setNumber: 1, weightKg: 24, reps: 10 },
    { id: "s7", workoutId: "w-2026-07-30", exercise: "Utfall", setNumber: 2, weightKg: 24, reps: 10 },
    { id: "s8", workoutId: "w-2026-07-30", exercise: "Stående leggpress", setNumber: 1, weightKg: 80, reps: 12 },
    { id: "s9", workoutId: "w-2026-07-30", exercise: "Stående leggpress", setNumber: 2, weightKg: 80, reps: 11 },
  ],
};

const volumtrend: WeeklyVolume[] = [
  { week: "Uke 24", volumeKg: 24800 },
  { week: "Uke 25", volumeKg: 27350 },
  { week: "Uke 26", volumeKg: 26100 },
  { week: "Uke 27", volumeKg: 29400 },
  { week: "Uke 28", volumeKg: 18200 }, // ferieuke
  { week: "Uke 29", volumeKg: 27900 },
  { week: "Uke 30", volumeKg: 30650 },
  { week: "Uke 31", volumeKg: 31200 },
];

const kontoer: Account[] = [
  { id: "a1", name: "Aksjesparekonto", valueNok: 412600 },
  { id: "a2", name: "IPS", valueNok: 98400 },
  { id: "a3", name: "Kryptokonto", valueNok: 21300 },
];

const portefolje: PortfolioPoint[] = [
  { date: "2026-02-01", valueNok: 461200 },
  { date: "2026-02-15", valueNok: 455800 },
  { date: "2026-03-01", valueNok: 468900 },
  { date: "2026-03-15", valueNok: 474100 },
  { date: "2026-04-01", valueNok: 462300 },
  { date: "2026-04-15", valueNok: 479500 },
  { date: "2026-05-01", valueNok: 488700 },
  { date: "2026-05-15", valueNok: 495200 },
  { date: "2026-06-01", valueNok: 491800 },
  { date: "2026-06-15", valueNok: 503600 },
  { date: "2026-07-01", valueNok: 512900 },
  { date: "2026-07-15", valueNok: 524400 },
  { date: "2026-08-01", valueNok: 532300 },
];

const vekt: Metric[] = [
  { date: "2026-05-11", weightKg: 84.6 },
  { date: "2026-05-18", weightKg: 84.3 },
  { date: "2026-05-25", weightKg: 84.5 },
  { date: "2026-06-01", weightKg: 84.0 },
  { date: "2026-06-08", weightKg: 83.7 },
  { date: "2026-06-15", weightKg: 83.9 },
  { date: "2026-06-22", weightKg: 83.4 },
  { date: "2026-06-29", weightKg: 83.1 },
  { date: "2026-07-06", weightKg: 83.3 },
  { date: "2026-07-13", weightKg: 82.8 },
  { date: "2026-07-20", weightKg: 82.6 },
  { date: "2026-07-27", weightKg: 82.4 },
];

const notater: Note[] = [
  {
    id: "n1",
    date: "2026-07-29",
    title: "Søvn og tunge løft",
    body: "Merker tydelig forskjell på knebøy når jeg har sovet under sju timer. Prioriter leggetid før underkroppsøktene – flytt dem heller til fredag om uken blir kort.",
  },
  {
    id: "n2",
    date: "2026-07-24",
    title: "Rebalansering",
    body: "Aksjeandelen har krøpet over 85 %. Vurder å flytte neste månedssparing til rentefond i stedet for å selge – enklere skattemessig, samme effekt over tid.",
  },
  {
    id: "n3",
    date: "2026-07-18",
    title: "Kutt uten stress",
    body: "Vekten går ned ~0,3 kg/uke uten at styrken faller. Det viktigste er å ikke jage raskere nedgang – planen fungerer, la den virke.",
  },
];

const vaner: Habit[] = [
  { id: "h1", name: "Trening" },
  { id: "h2", name: "Lesing" },
  { id: "h3", name: "Sideprosjekt" },
  { id: "h4", name: "Journaling" },
  { id: "h5", name: "10 000 skritt" },
  { id: "h6", name: "Investeringssjekk" },
];

// Deterministisk PRNG (mulberry32) med fast seed, så mock-dataen er identisk
// mellom renders og ikke gir hydration-avvik.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tilIsoDato(dato: Date): string {
  const aar = dato.getFullYear();
  const mnd = String(dato.getMonth() + 1).padStart(2, "0");
  const dag = String(dato.getDate()).padStart(2, "0");
  return `${aar}-${mnd}-${dag}`;
}

// Sannsynlighet per vane, justert for ukedag (0 = mandag … 6 = søndag)
// og fremgang over tid (t: 0 = periodens start, 1 = i dag).
function sannsynlighet(habitId: string, ukedag: number, t: number): number {
  const helg = ukedag >= 5;
  const trend = 0.75 + 0.35 * t; // bedre gjennomføring utover i perioden
  switch (habitId) {
    case "h1": return (helg ? 0.28 : 0.52) * trend; // Trening
    case "h2": return (helg ? 0.55 : 0.45) * trend; // Lesing
    case "h3": return (helg ? 0.48 : 0.28) * trend; // Sideprosjekt
    case "h4": return 0.68 * trend; // Journaling
    case "h5": return (helg ? 0.5 : 0.62) * trend; // 10 000 skritt
    case "h6": return ukedag === 0 ? 0.85 : 0.04; // Investeringssjekk (mandager)
    default: return 0;
  }
}

// 26 uker som slutter i inneværende uke: fra mandag 25 uker tilbake til i dag.
function genererVaneOppforinger(): { oppforinger: HabitEntry[]; fra: string; til: string } {
  const tilfeldig = mulberry32(42);
  const iDag = new Date();
  const ukedagIDag = (iDag.getDay() + 6) % 7; // 0 = mandag
  const fra = new Date(iDag);
  fra.setDate(iDag.getDate() - ukedagIDag - 25 * 7);

  const oppforinger: HabitEntry[] = [];
  const antallDager = 25 * 7 + ukedagIDag + 1;
  for (let i = 0; i < antallDager; i++) {
    const dato = new Date(fra);
    dato.setDate(fra.getDate() + i);
    const ukedag = (dato.getDay() + 6) % 7;
    const t = i / (antallDager - 1);
    const uke = Math.floor(i / 7);
    // Ferie (uke 8–9) og enkelte dårlige dager gir realistiske hull.
    const ferie = uke === 8 || uke === 9 ? 0.25 : 1;
    const daarligDag = tilfeldig() < 0.08 ? 0.15 : 1;
    for (const vane of vaner) {
      if (tilfeldig() < sannsynlighet(vane.id, ukedag, t) * ferie * daarligDag) {
        oppforinger.push({ habitId: vane.id, date: tilIsoDato(dato) });
      }
    }
  }
  return { oppforinger, fra: tilIsoDato(fra), til: tilIsoDato(iDag) };
}

// Byttes mot Supabase-spørringer i neste økt – signaturen består.
export async function getDashboardData(): Promise<DashboardData> {
  const { oppforinger, fra, til } = genererVaneOppforinger();
  return {
    sisteOkt,
    volumtrend,
    kontoer,
    portefolje,
    vekt,
    notater,
    vaner,
    vaneOppforinger: oppforinger,
    vanePeriode: { fra, til },
  };
}
