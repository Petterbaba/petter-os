import type { JournalEntry } from "@/lib/types";
import { opprettServerKlient } from "@/lib/supabase/server";

// RLS begrenser radene til innlogget bruker, så spørringene trenger aldri
// filtrere på user_id selv. PostgREST kapper svar stille ved «Max rows»
// (1000). Nyeste først + eksplisitt limit garanterer at ferske innførsler
// aldri faller utenfor.
const MAKS_RADER = 1000;

// Dagsvurderingen (1–5) bor i metrics-modellen (metric_types-raden
// 'day_rating'), men eksponeres av journal-domenet: koblingen til
// innførslene er datoen, og det er journal-siden som bruker den.
const VURDERING_NOKKEL = "day_rating";

// Unik nøkkel (user_id, written_on) håndhever én innførsel per dag.
// Postgres-feilkode 23505 (unique_violation) oversettes til denne, så
// actionen kan skille «dagen er opptatt» fra andre feil.
export class DagenHarInnforsel extends Error {
  constructor() {
    super("Dagen har allerede en innførsel.");
  }
}

export async function getJournal(): Promise<JournalEntry[]> {
  const supabase = await opprettServerKlient();
  const [innforsler, vurderinger] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("id, written_on, title, body")
      .order("written_on", { ascending: false })
      .limit(MAKS_RADER),
    supabase
      .from("metric_entries")
      .select("measured_on, value")
      .eq("metric_key", VURDERING_NOKKEL)
      .order("measured_on", { ascending: false })
      .limit(MAKS_RADER),
  ]);

  if (innforsler.error) {
    throw new Error(`Kunne ikke hente journalen: ${innforsler.error.message}`);
  }
  if (vurderinger.error) {
    throw new Error(
      `Kunne ikke hente dagsvurderinger: ${vurderinger.error.message}`,
    );
  }

  const vurderingPerDag = new Map(
    (vurderinger.data ?? []).map((rad) => [rad.measured_on, rad.value]),
  );

  return (innforsler.data ?? []).map((rad) => ({
    id: rad.id,
    date: rad.written_on,
    title: rad.title,
    body: rad.body,
    rating: vurderingPerDag.get(rad.written_on),
  }));
}

export async function lagreJournalInnforsel(
  skrevetDato: string,
  tittel: string,
  tekst: string,
): Promise<void> {
  const supabase = await opprettServerKlient();
  const { error } = await supabase.from("journal_entries").insert({
    written_on: skrevetDato,
    title: tittel,
    body: tekst,
  });

  if (error?.code === "23505") {
    throw new DagenHarInnforsel();
  }
  if (error) {
    throw new Error(`Kunne ikke lagre journalinnførsel: ${error.message}`);
  }
}

// Oppdatering skjer alltid via id (aldri upsert på dato): da kan en
// innførsel også flyttes til en annen, ledig dag uten å etterlate kopier.
export async function oppdaterJournalInnforsel(
  id: string,
  skrevetDato: string,
  tittel: string,
  tekst: string,
): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("journal_entries")
    .update({ written_on: skrevetDato, title: tittel, body: tekst })
    .eq("id", id)
    .select("id");

  if (error?.code === "23505") {
    throw new DagenHarInnforsel();
  }
  if (error) {
    throw new Error(`Kunne ikke oppdatere journalinnførsel: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher oppdateringen ingenting.
    throw new Error(`Fant ingen journalinnførsel å oppdatere (${id}).`);
  }
}

export async function slettJournalInnforsel(id: string): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(`Kunne ikke slette journalinnførsel: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher slettingen ingenting.
    throw new Error(`Fant ingen journalinnførsel å slette (${id}).`);
  }
}

export async function getDagsvurdering(dato: string): Promise<number | null> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("metric_entries")
    .select("value")
    .eq("metric_key", VURDERING_NOKKEL)
    .eq("measured_on", dato)
    .maybeSingle();

  if (error) {
    throw new Error(`Kunne ikke hente dagsvurdering: ${error.message}`);
  }
  return data?.value ?? null;
}

// Upsert på (user_id, metric_key, measured_on): ny vurdering samme dag
// overskriver. user_id settes av DB (default auth.uid()).
export async function lagreDagsvurdering(
  dato: string,
  verdi: number,
): Promise<void> {
  const supabase = await opprettServerKlient();
  const { error } = await supabase.from("metric_entries").upsert(
    {
      metric_key: VURDERING_NOKKEL,
      measured_on: dato,
      value: verdi,
    },
    { onConflict: "user_id,metric_key,measured_on" },
  );

  if (error) {
    throw new Error(`Kunne ikke lagre dagsvurdering: ${error.message}`);
  }
}
