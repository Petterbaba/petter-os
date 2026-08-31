import type { Metric, MetrikkType } from "@/lib/types";
import { opprettServerKlient } from "@/lib/supabase/server";

// Første domene på Supabase. RLS begrenser radene til innlogget bruker,
// så spørringene trenger aldri filtrere på user_id selv.
// PostgREST kapper svar stille ved «Max rows» (1000). Nyeste først +
// eksplisitt limit garanterer at ferske målinger aldri faller utenfor;
// snus til stigende rekkefølge for grafen.
const MAKS_RADER = 1000;

export async function getVekt(): Promise<Metric[]> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("metric_entries")
    .select("measured_on, value")
    .eq("metric_key", "weight")
    .order("measured_on", { ascending: false })
    .limit(MAKS_RADER);

  if (error) {
    throw new Error(`Kunne ikke hente vektmålinger: ${error.message}`);
  }

  return (data ?? [])
    .reverse()
    .map((rad) => ({ date: rad.measured_on, weightKg: rad.value }));
}

// Metrikk-katalogen (felles for alle brukere): mål-skjemaet lister den som
// valg, og mål-actionen validerer nøkler mot den.
export async function getMetrikkTyper(): Promise<MetrikkType[]> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("metric_types")
    .select("key, label, unit")
    .order("label");

  if (error) {
    throw new Error(`Kunne ikke hente metrikktyper: ${error.message}`);
  }

  return (data ?? []).map((rad) => ({
    key: rad.key,
    label: rad.label,
    unit: rad.unit,
  }));
}

// Upsert på (user_id, metric_key, measured_on): ny lagring samme dag
// overskriver dagens måling. user_id settes av DB (default auth.uid()).
export async function lagreVekt(
  maaltDato: string,
  vektKg: number,
  notat?: string,
): Promise<void> {
  const supabase = await opprettServerKlient();
  const { error } = await supabase.from("metric_entries").upsert(
    {
      metric_key: "weight",
      measured_on: maaltDato,
      value: vektKg,
      note: notat ?? null,
    },
    { onConflict: "user_id,metric_key,measured_on" },
  );

  if (error) {
    throw new Error(`Kunne ikke lagre vektmåling: ${error.message}`);
  }
}
