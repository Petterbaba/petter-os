// Domenetypene er UI-ets kontrakt: komponentene kjenner kun disse.
// Datalaget i src/lib/data/ mapper fra DB-rader (eller mock) til disse typene,
// så komponentene aldri berøres når en datakilde byttes.

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

export type VaneData = {
  vaner: Habit[];
  oppforinger: HabitEntry[];
  periode: { fra: string; til: string };
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
