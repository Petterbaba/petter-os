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

export type DashboardData = {
  sisteOkt: Workout;
  volumtrend: WeeklyVolume[];
  kontoer: Account[];
  portefolje: PortfolioPoint[];
  vekt: Metric[];
  notater: Note[];
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

// Byttes mot Supabase-spørringer i neste økt – signaturen består.
export async function getDashboardData(): Promise<DashboardData> {
  return { sisteOkt, volumtrend, kontoer, portefolje, vekt, notater };
}
