import type {
  Goal,
  GoalEntry,
  MaalData,
  MaalKilde,
  MaalRetning,
  MaalType,
  MisogiUtfall,
} from "@/lib/types";
import { opprettServerKlient } from "@/lib/supabase/server";
import { iDagOslo } from "@/lib/dato";

// Metrikk-katalogen eksponeres via mål-domenet (journal-presedensen for
// day_rating): /maal-siden og -actionen skal kun kjenne sitt eget datalag.
export { getMetrikkTyper } from "./metrics";

// RLS begrenser radene til innlogget bruker, så spørringene trenger aldri
// filtrere på user_id selv. PostgREST kapper svar stille ved «Max rows»
// (1000). Nyeste først + eksplisitt limit garanterer at ferske mål
// aldri faller utenfor.
const MAKS_RADER = 1000;

// Enheten for telle-mål avledes av kilden – lagres aldri.
const KILDE_ENHET: Record<MaalKilde, string> = {
  journal: "innførsler",
  reiser: "reiser",
  land: "nye land",
};

// Delvis unik indeks (user_id, misogi_year) håndhever én misogi per år.
// Postgres-feilkode 23505 (unique_violation) oversettes til denne, så
// actionen kan skille «året er opptatt» fra andre feil.
export class AaretHarMisogi extends Error {
  constructor() {
    super("Året har allerede en misogi.");
  }
}

// Innslag utenfor målets periode avvises (telle-kildene har samme regel),
// så «Utløpt» aldri kan vippes til «Fullført» etter fristen.
export class UtenforMaalPerioden extends Error {
  constructor() {
    super("Innslaget ligger utenfor målets periode.");
  }
}

// Bytte til automatisk sporing blokkeres når målet har loggede innslag –
// de ville blitt usynlige (og talt igjen ved bytte tilbake).
export class MaaletHarInnslag extends Error {
  constructor() {
    super("Målet har loggede fremdriftsinnslag.");
  }
}

type Klient = Awaited<ReturnType<typeof opprettServerKlient>>;

// Fremdriften er AVLEDET og lagres aldri på goals (jf. CLAUDE.md):
//   metric_key satt   → siste måling fra metric_entries; baseline = nyeste
//                       måling fra før startdatoen (fallback: eldste)
//   count_source satt → telling i journal_entries/trips innenfor perioden
//   ellers            → sum av goal_entries (manuell logg)
// Kildespørringene kjøres kun for kilder som faktisk er i bruk.
export async function getMaalData(): Promise<MaalData> {
  const supabase = await opprettServerKlient();
  const [maalRes, loggRes] = await Promise.all([
    supabase
      .from("goals")
      .select(
        "id, kind, title, motivation, misogi_year, outcome, reflection, starts_on, due_on, target_value, unit, metric_key, target_direction, count_source, metric_types ( unit )",
      )
      .order("created_at", { ascending: false })
      .limit(MAKS_RADER),
    supabase
      .from("goal_entries")
      .select("id, goal_id, logged_on, value, note")
      .order("logged_on", { ascending: false })
      .limit(MAKS_RADER),
  ]);

  if (maalRes.error) {
    throw new Error(`Kunne ikke hente mål: ${maalRes.error.message}`);
  }
  if (loggRes.error) {
    throw new Error(
      `Kunne ikke hente fremdriftslogg: ${loggRes.error.message}`,
    );
  }

  const rader = maalRes.data ?? [];
  const logg: GoalEntry[] = (loggRes.data ?? []).map((rad) => ({
    id: rad.id,
    goalId: rad.goal_id,
    loggedOn: rad.logged_on,
    value: rad.value,
    note: rad.note,
  }));

  const metrikkNokler = [
    ...new Set(
      rader
        .map((rad) => rad.metric_key)
        .filter((nokkel): nokkel is string => nokkel !== null),
    ),
  ];
  const trengerJournal = rader.some((rad) => rad.count_source === "journal");
  const trengerTurer = rader.some(
    (rad) => rad.count_source === "reiser" || rad.count_source === "land",
  );

  const [maalingerPerNokkel, journalDatoer, turer] = await Promise.all([
    hentMaalinger(supabase, metrikkNokler),
    trengerJournal ? hentJournalDatoer(supabase) : Promise.resolve([]),
    trengerTurer ? hentTurer(supabase) : Promise.resolve([]),
  ]);

  const innslagPerMaal = new Map<string, GoalEntry[]>();
  for (const innslag of logg) {
    const liste = innslagPerMaal.get(innslag.goalId);
    if (liste) {
      liste.push(innslag);
    } else {
      innslagPerMaal.set(innslag.goalId, [innslag]);
    }
  }

  const iDag = iDagOslo();
  const maal: Goal[] = rader.map((rad) => {
    let progressValue: number | null = null;
    let baselineValue: number | null = null;
    let enhet = rad.unit;

    if (rad.kind === "maal") {
      if (rad.metric_key !== null) {
        const maalinger = maalingerPerNokkel.get(rad.metric_key) ?? [];
        ({ progressValue, baselineValue } = metrikkFremdrift(
          maalinger,
          rad.starts_on,
          rad.due_on,
        ));
        enhet = rad.metric_types?.unit ?? rad.unit;
      } else if (rad.count_source !== null) {
        const kilde = rad.count_source as MaalKilde;
        // Telles aldri frem i tid: reise-domenet tillater fremtidige
        // (planlagte) turer, og de gir først fremdrift når de starter.
        const tilOgMed =
          rad.due_on !== null && rad.due_on < iDag ? rad.due_on : iDag;
        progressValue =
          kilde === "journal"
            ? tellIPeriode(journalDatoer, rad.starts_on, tilOgMed)
            : kilde === "reiser"
              ? tellIPeriode(
                  turer.map((tur) => tur.started_on),
                  rad.starts_on,
                  tilOgMed,
                )
              : tellNyeLand(turer, rad.starts_on, tilOgMed);
        enhet = KILDE_ENHET[kilde];
      } else {
        // Kun innslag i målets periode teller (samme regel som telle-
        // kildene; skriv-siden validerer også – dette er vern i dybden).
        progressValue = (innslagPerMaal.get(rad.id) ?? [])
          .filter(
            (innslag) =>
              (rad.starts_on === null || innslag.loggedOn >= rad.starts_on) &&
              (rad.due_on === null || innslag.loggedOn <= rad.due_on),
          )
          .reduce((sum, innslag) => sum + innslag.value, 0);
      }
    }

    return {
      id: rad.id,
      // CHECK-constraintene i DB garanterer gyldige enum-verdier.
      kind: rad.kind as MaalType,
      title: rad.title,
      motivation: rad.motivation,
      misogiYear: rad.misogi_year,
      outcome: rad.outcome as MisogiUtfall | null,
      reflection: rad.reflection,
      startsOn: rad.starts_on,
      dueOn: rad.due_on,
      targetValue: rad.target_value,
      unit: enhet,
      metricKey: rad.metric_key,
      direction: rad.target_direction as MaalRetning | null,
      countSource: rad.count_source as MaalKilde | null,
      progressValue,
      baselineValue,
    };
  });

  return { maal, logg };
}

async function hentMaalinger(
  supabase: Klient,
  nokler: string[],
): Promise<Map<string, { measured_on: string; value: number }[]>> {
  const resultater = await Promise.all(
    nokler.map((nokkel) =>
      supabase
        .from("metric_entries")
        .select("measured_on, value")
        .eq("metric_key", nokkel)
        .order("measured_on", { ascending: false })
        .limit(MAKS_RADER),
    ),
  );

  const perNokkel = new Map<string, { measured_on: string; value: number }[]>();
  nokler.forEach((nokkel, indeks) => {
    const resultat = resultater[indeks];
    if (resultat.error) {
      throw new Error(
        `Kunne ikke hente målinger for ${nokkel}: ${resultat.error.message}`,
      );
    }
    perNokkel.set(nokkel, resultat.data ?? []);
  });
  return perNokkel;
}

async function hentJournalDatoer(supabase: Klient): Promise<string[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("written_on")
    .order("written_on", { ascending: false })
    .limit(MAKS_RADER);

  if (error) {
    throw new Error(`Kunne ikke hente journaldatoer: ${error.message}`);
  }
  return (data ?? []).map((rad) => rad.written_on);
}

async function hentTurer(
  supabase: Klient,
): Promise<{ country_code: string; started_on: string }[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("country_code, started_on")
    .order("started_on", { ascending: false })
    .limit(MAKS_RADER);

  if (error) {
    throw new Error(`Kunne ikke hente turer: ${error.message}`);
  }
  return data ?? [];
}

// Målingene kommer nyest først. Nåverdien er nyeste måling til og med
// fristen – målinger ETTER fristen kan hverken av-fullføre eller sent
// fullføre et utløpt mål. Utgangsmålingen er den nyeste fra FØR start-
// datoen (fallback: eldste tilgjengelige, for den som begynte å måle
// etter at målet startet).
function metrikkFremdrift(
  alleMaalinger: { measured_on: string; value: number }[],
  startsOn: string | null,
  dueOn: string | null,
): { progressValue: number | null; baselineValue: number | null } {
  const maalinger =
    dueOn === null
      ? alleMaalinger
      : alleMaalinger.filter((maaling) => maaling.measured_on <= dueOn);
  if (maalinger.length === 0) {
    return { progressValue: null, baselineValue: null };
  }
  const foerStart =
    startsOn === null
      ? undefined
      : maalinger.find((maaling) => maaling.measured_on < startsOn);
  return {
    progressValue: maalinger[0].value,
    baselineValue: (foerStart ?? maalinger[maalinger.length - 1]).value,
  };
}

function tellIPeriode(
  datoer: string[],
  fra: string | null,
  til: string,
): number {
  return datoer.filter(
    (dato) => (fra === null || dato >= fra) && dato <= til,
  ).length;
}

// «Nye land»: distinkte landkoder i perioden som ikke er besøkt før start.
function tellNyeLand(
  turer: { country_code: string; started_on: string }[],
  fra: string | null,
  til: string,
): number {
  const besoktFoer = new Set(
    fra === null
      ? []
      : turer
          .filter((tur) => tur.started_on < fra)
          .map((tur) => tur.country_code),
  );
  const nye = new Set(
    turer
      .filter(
        (tur) =>
          (fra === null || tur.started_on >= fra) &&
          tur.started_on <= til &&
          !besoktFoer.has(tur.country_code),
      )
      .map((tur) => tur.country_code),
  );
  return nye.size;
}

// Skriv-typene er smalere enn Goal: utfall/refleksjon har egen flyt
// (settMisogiUtfall), så vanlig redigering aldri kan overskrive dem stille.
export type NyttMaal = {
  title: string;
  motivation: string | null;
  startsOn: string;
  dueOn: string | null;
  targetValue: number;
  unit: string | null;
  metricKey: string | null;
  direction: MaalRetning | null;
  countSource: MaalKilde | null;
};

export type NyMisogi = {
  title: string;
  motivation: string | null;
  misogiYear: number;
  dueOn: string | null;
};

export async function lagreMaal(maal: NyttMaal): Promise<void> {
  const supabase = await opprettServerKlient();
  const { error } = await supabase.from("goals").insert({
    kind: "maal",
    title: maal.title,
    motivation: maal.motivation,
    starts_on: maal.startsOn,
    due_on: maal.dueOn,
    target_value: maal.targetValue,
    unit: maal.unit,
    metric_key: maal.metricKey,
    target_direction: maal.direction,
    count_source: maal.countSource,
  });

  if (error) {
    throw new Error(`Kunne ikke lagre målet: ${error.message}`);
  }
}

// Oppdatering skjer alltid via id (samme mønster som journalen/reisene).
export async function oppdaterMaal(id: string, maal: NyttMaal): Promise<void> {
  const supabase = await opprettServerKlient();

  // Bytte til automatisk sporing med loggede innslag ville gjort dem
  // usynlige i UI-et (og talt dem igjen ved bytte tilbake) – blokkeres.
  if (maal.metricKey !== null || maal.countSource !== null) {
    const { count, error: tellFeil } = await supabase
      .from("goal_entries")
      .select("id", { count: "exact", head: true })
      .eq("goal_id", id);
    if (tellFeil) {
      throw new Error(
        `Kunne ikke sjekke fremdriftsloggen: ${tellFeil.message}`,
      );
    }
    if ((count ?? 0) > 0) {
      throw new MaaletHarInnslag();
    }
  }

  const { data, error } = await supabase
    .from("goals")
    .update({
      title: maal.title,
      motivation: maal.motivation,
      starts_on: maal.startsOn,
      due_on: maal.dueOn,
      target_value: maal.targetValue,
      unit: maal.unit,
      metric_key: maal.metricKey,
      target_direction: maal.direction,
      count_source: maal.countSource,
    })
    .eq("id", id)
    .eq("kind", "maal")
    .select("id");

  if (error) {
    throw new Error(`Kunne ikke oppdatere målet: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher oppdateringen ingenting.
    throw new Error(`Fant ingen mål å oppdatere (${id}).`);
  }
}

export async function lagreMisogi(misogi: NyMisogi): Promise<void> {
  const supabase = await opprettServerKlient();
  const { error } = await supabase.from("goals").insert({
    kind: "misogi",
    title: misogi.title,
    motivation: misogi.motivation,
    misogi_year: misogi.misogiYear,
    due_on: misogi.dueOn,
    outcome: "planlagt",
  });

  if (error?.code === "23505") {
    throw new AaretHarMisogi();
  }
  if (error) {
    throw new Error(`Kunne ikke lagre misogien: ${error.message}`);
  }
}

// Rører aldri utfall/refleksjon – de settes kun via settMisogiUtfall.
export async function oppdaterMisogi(
  id: string,
  misogi: NyMisogi,
): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("goals")
    .update({
      title: misogi.title,
      motivation: misogi.motivation,
      misogi_year: misogi.misogiYear,
      due_on: misogi.dueOn,
    })
    .eq("id", id)
    .eq("kind", "misogi")
    .select("id");

  if (error?.code === "23505") {
    // Flytting til et år som allerede har en misogi.
    throw new AaretHarMisogi();
  }
  if (error) {
    throw new Error(`Kunne ikke oppdatere misogien: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher oppdateringen ingenting.
    throw new Error(`Fant ingen misogi å oppdatere (${id}).`);
  }
}

export async function settMisogiUtfall(
  id: string,
  utfall: MisogiUtfall,
  refleksjon: string | null,
): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("goals")
    .update({ outcome: utfall, reflection: refleksjon })
    .eq("id", id)
    .eq("kind", "misogi")
    .select("id");

  if (error) {
    throw new Error(`Kunne ikke lagre utfallet: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher oppdateringen ingenting.
    throw new Error(`Fant ingen misogi å sette utfall på (${id}).`);
  }
}

// Sletter mål av begge slag; goal_entries følger med (on delete cascade).
export async function slettMaal(id: string): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(`Kunne ikke slette målet: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher slettingen ingenting.
    throw new Error(`Fant ingen mål å slette (${id}).`);
  }
}

export type NyFremdrift = Omit<GoalEntry, "id">;

// Manuell logg gjelder kun manuelle mål – automatiske (metrikk/telle) og
// misogi avvises her, så en manipulert maalId ikke kan blande moduser.
export async function loggFremdrift(innslag: NyFremdrift): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data: maal, error: maalFeil } = await supabase
    .from("goals")
    .select("id, kind, metric_key, count_source, starts_on, due_on")
    .eq("id", innslag.goalId)
    .maybeSingle();

  if (maalFeil) {
    throw new Error(`Kunne ikke hente målet: ${maalFeil.message}`);
  }
  if (!maal) {
    throw new Error(`Fant ingen mål å logge fremdrift på (${innslag.goalId}).`);
  }
  if (
    maal.kind !== "maal" ||
    maal.metric_key !== null ||
    maal.count_source !== null
  ) {
    throw new Error("Fremdrift kan bare logges på mål med manuell sporing.");
  }
  if (
    (maal.starts_on !== null && innslag.loggedOn < maal.starts_on) ||
    (maal.due_on !== null && innslag.loggedOn > maal.due_on)
  ) {
    throw new UtenforMaalPerioden();
  }

  const { error } = await supabase.from("goal_entries").insert({
    goal_id: innslag.goalId,
    logged_on: innslag.loggedOn,
    value: innslag.value,
    note: innslag.note,
  });

  if (error) {
    throw new Error(`Kunne ikke logge fremdrift: ${error.message}`);
  }
}

export async function slettFremdrift(id: string): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("goal_entries")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(`Kunne ikke slette innslaget: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher slettingen ingenting.
    throw new Error(`Fant ingen innslag å slette (${id}).`);
  }
}
