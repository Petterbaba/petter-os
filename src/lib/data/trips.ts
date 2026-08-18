import type { ReiseKategori, Trip } from "@/lib/types";
import { opprettServerKlient } from "@/lib/supabase/server";

// RLS begrenser radene til innlogget bruker, så spørringene trenger aldri
// filtrere på user_id selv. PostgREST kapper svar stille ved «Max rows»
// (1000). Nyeste først + eksplisitt limit garanterer at ferske turer
// aldri faller utenfor.
const MAKS_RADER = 1000;

export async function getReiser(): Promise<Trip[]> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, title, country_code, city, started_on, ended_on, cost_nok, rating, companions, category, notes",
    )
    .order("started_on", { ascending: false })
    .limit(MAKS_RADER);

  if (error) {
    throw new Error(`Kunne ikke hente reiser: ${error.message}`);
  }

  return (data ?? []).map((rad) => ({
    id: rad.id,
    title: rad.title,
    countryCode: rad.country_code,
    city: rad.city,
    startedOn: rad.started_on,
    endedOn: rad.ended_on,
    costNok: rad.cost_nok,
    rating: rad.rating,
    companions: rad.companions,
    // CHECK-constrainten i DB garanterer at verdien er en gyldig kategori.
    category: rad.category as ReiseKategori | null,
    notes: rad.notes,
  }));
}

export type NyReise = Omit<Trip, "id">;

export async function lagreReise(reise: NyReise): Promise<void> {
  const supabase = await opprettServerKlient();
  const { error } = await supabase.from("trips").insert({
    title: reise.title,
    country_code: reise.countryCode,
    city: reise.city,
    started_on: reise.startedOn,
    ended_on: reise.endedOn,
    cost_nok: reise.costNok,
    rating: reise.rating,
    companions: reise.companions,
    category: reise.category,
    notes: reise.notes,
  });

  if (error) {
    throw new Error(`Kunne ikke lagre reisen: ${error.message}`);
  }
}

// Oppdatering skjer alltid via id (samme mønster som journalen).
export async function oppdaterReise(id: string, reise: NyReise): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("trips")
    .update({
      title: reise.title,
      country_code: reise.countryCode,
      city: reise.city,
      started_on: reise.startedOn,
      ended_on: reise.endedOn,
      cost_nok: reise.costNok,
      rating: reise.rating,
      companions: reise.companions,
      category: reise.category,
      notes: reise.notes,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(`Kunne ikke oppdatere reisen: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher oppdateringen ingenting.
    throw new Error(`Fant ingen reise å oppdatere (${id}).`);
  }
}

export async function slettReise(id: string): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("trips")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(`Kunne ikke slette reisen: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher slettingen ingenting.
    throw new Error(`Fant ingen reise å slette (${id}).`);
  }
}
