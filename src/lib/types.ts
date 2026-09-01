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

// Én datert refleksjon (speiler journal_entries-tabellen; maks én per dag).
// `rating` er dagsvurderingen (1–5) fra metrics-nøkkelen 'day_rating',
// flettet inn av datalaget – ikke en kolonne på journal_entries.
export type JournalEntry = {
  id: string;
  date: string; // ISO 8601
  title: string;
  body: string;
  rating?: number; // 1–5
};

export const REISE_KATEGORIER = [
  "ferie",
  "helgetur",
  "jobb",
  "familiebesøk",
  "annet",
] as const;

export type ReiseKategori = (typeof REISE_KATEGORIER)[number];

// Én reise (speiler trips-tabellen). Landet er ISO 3166-1 alfa-2 i små
// bokstaver (matcher verdenskart-SVG-ens id-er); landnavn og antall netter
// er avledet (formatNavn/landNavn hhv. datoene) og lagres aldri.
export type Trip = {
  id: string;
  title: string;
  countryCode: string;
  city: string | null;
  startedOn: string; // ISO 8601
  endedOn: string; // ISO 8601
  costNok: number | null;
  rating: number | null; // 1–5
  companions: string | null;
  category: ReiseKategori | null;
  notes: string | null;
};

export const MAAL_TYPER = ["misogi", "maal"] as const;

export type MaalType = (typeof MAAL_TYPER)[number];

export const MAAL_RETNINGER = ["opp", "ned"] as const;

export type MaalRetning = (typeof MAAL_RETNINGER)[number];

export const MISOGI_UTFALL = ["planlagt", "forsøkt", "fullført"] as const;

export type MisogiUtfall = (typeof MISOGI_UTFALL)[number];

export const MAAL_KILDER = ["journal", "reiser", "land"] as const;

export type MaalKilde = (typeof MAAL_KILDER)[number];

// Ett mål (speiler goals-tabellen). Misogi (ett årsdefinerende mål per år)
// har utfall i stedet for tallfremdrift. progressValue/baselineValue er
// AVLEDET og flettes inn av datalaget (journal-rating-mønsteret):
//   metricKey satt   → siste/utgangs-måling fra metric_entries
//   countSource satt → telling i journal_entries/trips
//   ellers           → sum av goal_entries (manuell logg)
// unit for automatiske mål avledes også av datalaget (metric_types/kilden).
export type Goal = {
  id: string;
  kind: MaalType;
  title: string;
  motivation: string | null;
  misogiYear: number | null;
  outcome: MisogiUtfall | null;
  reflection: string | null;
  startsOn: string | null; // ISO 8601
  dueOn: string | null; // ISO 8601; misogi: planlagt dato
  targetValue: number | null;
  unit: string | null;
  metricKey: string | null;
  direction: MaalRetning | null;
  countSource: MaalKilde | null;
  progressValue: number | null; // avledet
  baselineValue: number | null; // avledet (kun metrikk-lenkede)
};

// Ett manuelt fremdriftsinnslag (speiler goal_entries-tabellen).
export type GoalEntry = {
  id: string;
  goalId: string;
  loggedOn: string; // ISO 8601
  value: number;
  note: string | null;
};

export type MaalData = {
  maal: Goal[];
  logg: GoalEntry[];
};

// Én rad i metrikk-katalogen (speiler metric_types-tabellen).
export type MetrikkType = {
  key: string;
  label: string;
  unit: string;
};

// Én porsjonsvekt fra Matvaretabellen («stk» = 155 g) til gram-omregning.
export type FoodPortion = {
  name: string;
  grams: number;
};

// Én matvare (speiler food_items-tabellen – DELT referansedata synket fra
// Matvaretabellen, samme rader for alle brukere). Verdiene er per 100 g.
export type FoodItem = {
  id: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number | null;
  fatPer100g: number | null;
  carbsPer100g: number | null;
  portions: FoodPortion[];
};

// Én ingrediensrad (speiler dinner_ingredients). `foodItem` flettes inn av
// datalaget; raden teller i næringsberegningen kun når både foodItem og
// amountGrams er satt («salt og pepper» står med bare label).
export type DinnerIngredient = {
  id: string;
  label: string; // navnet slik oppskriften sier det
  amountGrams: number | null;
  position: number;
  foodItem: FoodItem | null;
};

// Én middag i katalogen (speiler dinners-tabellen + ingrediensradene).
// Næring per porsjon er AVLEDET (src/lib/ernaering.ts) og lagres aldri.
export type Dinner = {
  id: string;
  title: string;
  servings: number;
  instructions: string | null;
  notes: string | null;
  odaRecipeId: string | null;
  sourceUrl: string | null;
  ingredients: DinnerIngredient[];
};

// Én planlagt middag (speiler dinner_plans; maks én per dag – ny lagring
// samme dag overskriver via upsert-nøkkelen (user_id, planned_on)).
export type DinnerPlan = {
  id: string;
  plannedOn: string; // ISO 8601
  dinnerId: string;
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
  journal: JournalEntry[];
  maal: Goal[];
  vaner: Habit[];
  vaneOppforinger: HabitEntry[];
  vanePeriode: { fra: string; til: string };
};
