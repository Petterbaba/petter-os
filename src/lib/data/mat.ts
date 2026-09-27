import type { QueryData } from "@supabase/supabase-js";
import type {
  CookingSession,
  Dinner,
  DinnerPlan,
  FoodItem,
  FoodPortion,
  MatlagingsData,
  OdaProduct,
} from "@/lib/types";
import type { Json } from "@/lib/database.types";
import { erEnhet, type Enhet } from "@/lib/enheter";
import { erVanskelighet, type Vanskelighet } from "@/lib/matlaging";
import { opprettServerKlient } from "@/lib/supabase/server";

type ServerKlient = Awaited<ReturnType<typeof opprettServerKlient>>;

// RLS begrenser dinners/dinner_plans til innlogget bruker, så spørringene
// trenger aldri filtrere på user_id selv; food_items er delt referansedata
// alle innloggede leser. PostgREST kapper svar stille ved «Max rows»
// (1000) – eksplisitt limit gjør taket synlig her.
const MAKS_RADER = 1000;

// Delvis unik indeks (user_id, oda_recipe_id) håndhever at samme
// Oda-oppskrift bare importeres én gang. 23505 oversettes til denne
// (journal-mønsteret), så importflyten kan si «allerede importert».
export class MiddagAlleredeImportert extends Error {
  constructor() {
    super("Oppskriften er allerede importert.");
  }
}

const MATVARE_KOLONNER =
  "id, name, kcal_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, portions";

// NB: må være ÉN bokstavelig streng – supabase-js parser select-strengen på
// typenivå, og sammensetting («+»/template) kollapser typene til feil.
// dinners.instructions leses bevisst IKKE: fremgangsmåten bor i
// dinner_steps (kokebok-migrasjonen), og kolonnen droppes i en egen
// migrasjon når denne koden er deployet.
const MIDDAG_KOLONNER =
  "id, title, servings, cook_minutes, difficulty, notes, oda_recipe_id, source_url, dinner_ingredients(id, label, amount, unit, oda_product_id, position, food_items(id, name, kcal_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, portions)), dinner_steps(id, position, body)";

type MatvareRad = {
  id: string;
  name: string;
  kcal_per_100g: number;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  carbs_per_100g: number | null;
  fiber_per_100g: number | null;
  portions: Json;
};

// portions er jsonb skrevet av synkscriptet ([{name, grams}]); parses
// tolerant så en uventet form aldri velter siden.
function tilPorsjoner(portions: Json): FoodPortion[] {
  if (!Array.isArray(portions)) {
    return [];
  }
  const resultat: FoodPortion[] = [];
  for (const porsjon of portions) {
    if (
      porsjon !== null &&
      typeof porsjon === "object" &&
      !Array.isArray(porsjon) &&
      typeof porsjon.name === "string" &&
      typeof porsjon.grams === "number"
    ) {
      resultat.push({ name: porsjon.name, grams: porsjon.grams });
    }
  }
  return resultat;
}

function tilMatvare(rad: MatvareRad): FoodItem {
  return {
    id: rad.id,
    name: rad.name,
    kcalPer100g: rad.kcal_per_100g,
    proteinPer100g: rad.protein_per_100g,
    fatPer100g: rad.fat_per_100g,
    carbsPer100g: rad.carbs_per_100g,
    fiberPer100g: rad.fiber_per_100g,
    portions: tilPorsjoner(rad.portions),
  };
}

// Felles grunnspørring for katalogen og enkeltoppskriften, så radtypen
// (og dermed mappingen) har én kilde. Arkiverte middager er skjult overalt.
function middagSporring(supabase: ServerKlient) {
  return supabase
    .from("dinners")
    .select(MIDDAG_KOLONNER)
    .is("archived_at", null);
}

type MiddagRad = QueryData<ReturnType<typeof middagSporring>>[number];

function tilMiddag(rad: MiddagRad): Dinner {
  return {
    id: rad.id,
    title: rad.title,
    servings: rad.servings,
    cookMinutes: rad.cook_minutes,
    // DB-checken håndhever settet; tolerant mapping som for enhetene.
    difficulty:
      rad.difficulty !== null && erVanskelighet(rad.difficulty)
        ? rad.difficulty
        : null,
    notes: rad.notes,
    odaRecipeId: rad.oda_recipe_id,
    sourceUrl: rad.source_url,
    ingredients: rad.dinner_ingredients
      .map((ingrediens) => ({
        id: ingrediens.id,
        label: ingrediens.label,
        amount: ingrediens.amount,
        // DB håndhever kun generisk ikke-tom enhet; en ukjent verdi (kan
        // ikke skrives via appen) tolkes tolerant som gram.
        unit: erEnhet(ingrediens.unit) ? ingrediens.unit : "g",
        odaProductId: ingrediens.oda_product_id,
        position: ingrediens.position,
        foodItem:
          ingrediens.food_items === null
            ? null
            : tilMatvare(ingrediens.food_items),
      }))
      .sort((a, b) => a.position - b.position),
    steps: rad.dinner_steps
      .map((steg) => ({ id: steg.id, position: steg.position, body: steg.body }))
      .sort((a, b) => a.position - b.position),
  };
}

export async function getMiddager(): Promise<Dinner[]> {
  const supabase = await opprettServerKlient();
  const { data, error } = await middagSporring(supabase)
    .order("title")
    .limit(MAKS_RADER);

  if (error) {
    throw new Error(`Kunne ikke hente middager: ${error.message}`);
  }

  return (data ?? []).map(tilMiddag);
}

// Én oppskrift til /kokebok/[id]. null når den ikke finnes, er arkivert
// eller tilhører en annen bruker (RLS skjuler den) – siden gir da 404.
export async function getMiddag(id: string): Promise<Dinner | null> {
  const supabase = await opprettServerKlient();
  const { data, error } = await middagSporring(supabase)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Kunne ikke hente oppskriften: ${error.message}`);
  }

  return data === null ? null : tilMiddag(data);
}

// Søk til ingrediens-mappingen: enkel ilike holder for 2 121 rader.
// Jokertegn strippes fra brukerinput – matvarenavn inneholder dem aldri.
export async function sokMatvarer(sok: string): Promise<FoodItem[]> {
  const renset = sok.replace(/[%_\\]/g, "").trim();
  if (renset === "") {
    return [];
  }

  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("food_items")
    .select(MATVARE_KOLONNER)
    .is("archived_at", null)
    .ilike("name", `%${renset}%`)
    .order("name")
    .limit(20);

  if (error) {
    throw new Error(`Kunne ikke søke i matvarer: ${error.message}`);
  }

  return (data ?? []).map(tilMatvare);
}

// Autosøk i den LOKALE Oda-katalogen (speilet av scripts/synk-oda.mjs) –
// raskt og stabilt, uavhengig av Odas servere og uten Oda-innlogging.
// Jokertegn og or-syntakstegn strippes fra brukerinput (sokMatvarer-
// presedensen; komma/parenteser ville brutt or-filteret).
export async function sokOdaProdukter(sok: string): Promise<OdaProduct[]> {
  const renset = sok.replace(/[%_\\,()]/g, "").trim();
  if (renset === "") {
    return [];
  }

  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("oda_products")
    .select(
      "source_id, name, brand, name_extra, gross_price, gross_unit_price, unit_price_unit",
    )
    .is("archived_at", null)
    .eq("is_available", true)
    .or(`name.ilike.%${renset}%,brand.ilike.%${renset}%`)
    .order("name")
    .limit(20);

  if (error) {
    throw new Error(`Kunne ikke søke i Oda-katalogen: ${error.message}`);
  }

  return (data ?? []).map((rad) => ({
    id: rad.source_id,
    name: rad.name,
    brand: rad.brand,
    nameExtra: rad.name_extra,
    grossPrice: rad.gross_price,
    grossUnitPrice: rad.gross_unit_price,
    unitPriceUnit: rad.unit_price_unit,
  }));
}

// Katalogstatus til den stille linjen på /mat («6 637 varer · synket …») –
// gjør ferskheten synlig uten at noen må åpne terminalen.
export async function getOdaKatalogStatus(): Promise<{
  antall: number;
  sistSynket: string | null;
}> {
  const supabase = await opprettServerKlient();
  const [antallSvar, synketSvar] = await Promise.all([
    supabase
      .from("oda_products")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null),
    supabase
      .from("oda_products")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1),
  ]);

  if (antallSvar.error) {
    throw new Error(
      `Kunne ikke hente katalogstatus: ${antallSvar.error.message}`,
    );
  }
  if (synketSvar.error) {
    throw new Error(
      `Kunne ikke hente katalogstatus: ${synketSvar.error.message}`,
    );
  }

  return {
    antall: antallSvar.count ?? 0,
    sistSynket: synketSvar.data?.[0]?.synced_at ?? null,
  };
}

export type NyIngrediens = {
  label: string;
  amount: number | null;
  unit: Enhet;
  odaProductId: string | null;
  foodItemId: string | null;
};

export type NyMiddag = {
  title: string;
  servings: number;
  cookMinutes: number | null;
  difficulty: Vanskelighet | null;
  notes: string | null;
  odaRecipeId: string | null;
  sourceUrl: string | null;
  ingredients: NyIngrediens[];
  steps: string[]; // ferdig trimmede stegtekster i rekkefølge
};

async function settInnIngredienser(
  supabase: ServerKlient,
  dinnerId: string,
  ingredienser: NyIngrediens[],
) {
  if (ingredienser.length === 0) {
    return null;
  }
  const { error } = await supabase.from("dinner_ingredients").insert(
    ingredienser.map((rad, indeks) => ({
      dinner_id: dinnerId,
      label: rad.label,
      amount: rad.amount,
      unit: rad.unit,
      oda_product_id: rad.odaProductId,
      food_item_id: rad.foodItemId,
      position: indeks,
    })),
  );
  return error;
}

// Speiler settInnIngredienser: position = rekkefølgen i skjemaet (0-basert,
// som backfillen i kokebok-migrasjonen).
async function settInnSteg(
  supabase: ServerKlient,
  dinnerId: string,
  steg: string[],
) {
  if (steg.length === 0) {
    return null;
  }
  const { error } = await supabase.from("dinner_steps").insert(
    steg.map((tekst, indeks) => ({
      dinner_id: dinnerId,
      position: indeks,
      body: tekst,
    })),
  );
  return error;
}

// Kolonnene middagen selv eier. instructions skrives aldri (se
// MIDDAG_KOLONNER) – kolonnen er nullbar, så insert uten den er gyldig
// både før og etter at den droppes.
function middagKolonner(middag: NyMiddag) {
  return {
    title: middag.title,
    servings: middag.servings,
    cook_minutes: middag.cookMinutes,
    difficulty: middag.difficulty,
    notes: middag.notes,
    oda_recipe_id: middag.odaRecipeId,
    source_url: middag.sourceUrl,
  };
}

export async function lagreMiddag(middag: NyMiddag): Promise<string> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("dinners")
    .insert(middagKolonner(middag))
    .select("id")
    .single();

  if (error?.code === "23505") {
    throw new MiddagAlleredeImportert();
  }
  if (error !== null || data === null) {
    throw new Error(`Kunne ikke lagre middagen: ${error?.message}`);
  }

  // PostgREST har ingen transaksjoner: feiler ingrediens- eller steg-
  // innsettingen, ryddes middagen bort igjen (kaskaden tar barna) så
  // katalogen aldri viser en halv oppskrift.
  const ingrediensFeil = await settInnIngredienser(
    supabase,
    data.id,
    middag.ingredients,
  );
  const stegFeil =
    ingrediensFeil === null
      ? await settInnSteg(supabase, data.id, middag.steps)
      : null;
  if (ingrediensFeil !== null || stegFeil !== null) {
    await supabase.from("dinners").delete().eq("id", data.id);
    throw new Error(
      `Kunne ikke lagre oppskriften: ${(ingrediensFeil ?? stegFeil)?.message}`,
    );
  }

  return data.id;
}

// Oppdatering skjer alltid via id (journal-mønsteret). Ingrediensene og
// stegene erstattes samlet (slett + sett inn på nytt) – skulle
// innsettingen feile, står middagen uten dem til neste lagring reparerer
// den. Sletting av stegene kaskaderer bort avhukinger i en pågående
// matlagingsøkt – bevisst (stegene de pekte på finnes ikke lenger).
export async function oppdaterMiddag(
  id: string,
  middag: NyMiddag,
): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("dinners")
    .update(middagKolonner(middag))
    .eq("id", id)
    .select("id");

  if (error?.code === "23505") {
    throw new MiddagAlleredeImportert();
  }
  if (error) {
    throw new Error(`Kunne ikke oppdatere middagen: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher oppdateringen ingenting.
    throw new Error(`Fant ingen middag å oppdatere (${id}).`);
  }

  const { error: sletteFeil } = await supabase
    .from("dinner_ingredients")
    .delete()
    .eq("dinner_id", id);
  if (sletteFeil) {
    throw new Error(
      `Kunne ikke erstatte ingrediensene: ${sletteFeil.message}`,
    );
  }

  const ingrediensFeil = await settInnIngredienser(
    supabase,
    id,
    middag.ingredients,
  );
  if (ingrediensFeil !== null) {
    throw new Error(`Kunne ikke lagre ingrediensene: ${ingrediensFeil.message}`);
  }

  const { error: stegSletteFeil } = await supabase
    .from("dinner_steps")
    .delete()
    .eq("dinner_id", id);
  if (stegSletteFeil) {
    throw new Error(`Kunne ikke erstatte stegene: ${stegSletteFeil.message}`);
  }

  const stegFeil = await settInnSteg(supabase, id, middag.steps);
  if (stegFeil !== null) {
    throw new Error(`Kunne ikke lagre stegene: ${stegFeil.message}`);
  }
}

// Katalogregelen: middager arkiveres, slettes aldri – ukesplan-historikken
// beholder referansen sin.
export async function arkiverMiddag(id: string): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("dinners")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");

  if (error) {
    throw new Error(`Kunne ikke arkivere middagen: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // RLS filtrerer bort andres rader – da matcher oppdateringen ingenting.
    throw new Error(`Fant ingen middag å arkivere (${id}).`);
  }
}

export async function getUkesplan(
  fra: string,
  til: string,
): Promise<DinnerPlan[]> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("dinner_plans")
    .select("id, planned_on, dinner_id")
    .gte("planned_on", fra)
    .lte("planned_on", til)
    .order("planned_on")
    .limit(MAKS_RADER);

  if (error) {
    throw new Error(`Kunne ikke hente ukesplanen: ${error.message}`);
  }

  return (data ?? []).map((rad) => ({
    id: rad.id,
    plannedOn: rad.planned_on,
    dinnerId: rad.dinner_id,
  }));
}

// Upsert på (user_id, planned_on): ny lagring samme dag bytter middagen
// (metrics-mønsteret). user_id settes av DB (default auth.uid()).
export async function planleggMiddag(
  plannedOn: string,
  dinnerId: string,
): Promise<void> {
  const supabase = await opprettServerKlient();
  const { error } = await supabase.from("dinner_plans").upsert(
    {
      planned_on: plannedOn,
      dinner_id: dinnerId,
    },
    { onConflict: "user_id,planned_on" },
  );

  if (error) {
    throw new Error(`Kunne ikke planlegge middagen: ${error.message}`);
  }
}

// Flere dager i ett kall (ukesmeny-generatoren) – samme upsert-nøkkel som
// planleggMiddag, så eksisterende valg de dagene byttes ut.
export async function planleggMiddager(
  planer: { plannedOn: string; dinnerId: string }[],
): Promise<void> {
  if (planer.length === 0) {
    return;
  }
  const supabase = await opprettServerKlient();
  const { error } = await supabase.from("dinner_plans").upsert(
    planer.map((plan) => ({
      planned_on: plan.plannedOn,
      dinner_id: plan.dinnerId,
    })),
    { onConflict: "user_id,planned_on" },
  );

  if (error) {
    throw new Error(`Kunne ikke lagre ukesmenyen: ${error.message}`);
  }
}

// Bevisst idempotent (avvik fra trips/journal-slettingene): «sett dagen
// til ingen middag» skal lykkes også når planen alt er borte – dag-
// selecten i ukesplanen kan ellers feile på et kappløp med seg selv.
export async function fjernPlanlagtMiddag(plannedOn: string): Promise<void> {
  const supabase = await opprettServerKlient();
  const { error } = await supabase
    .from("dinner_plans")
    .delete()
    .eq("planned_on", plannedOn);

  if (error) {
    throw new Error(`Kunne ikke fjerne planlagt middag: ${error.message}`);
  }
}

// Dra-og-slipp i ukesplanen: flytter middagen fra én dag til en annen.
// Tilstanden leses her, aldri fra klienten – kortet kan ha blitt endret
// i en annen fane siden siden ble lastet.
//  - Ledig måldag: raden får ny dato (én UPDATE – atomisk, og unik
//    (user_id, planned_on) stopper et kappløp mot en dag som nettopp
//    ble fylt).
//  - Opptatt måldag: de to dagene bytter middag i ÉN upsert med to rader
//    (atomisk – ingen mellomtilstand der en dag mangler middag).
// Svarer false når fra-dagen ikke har noen middag (lenger).
export async function flyttPlanlagtMiddag(
  fra: string,
  til: string,
): Promise<boolean> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("dinner_plans")
    .select("planned_on, dinner_id")
    .in("planned_on", [fra, til]);

  if (error) {
    throw new Error(`Kunne ikke lese ukesplanen: ${error.message}`);
  }

  const kilde = data.find((rad) => rad.planned_on === fra);
  const maal = data.find((rad) => rad.planned_on === til);
  if (kilde === undefined) {
    return false;
  }

  if (maal === undefined) {
    const { error: flyttFeil } = await supabase
      .from("dinner_plans")
      .update({ planned_on: til })
      .eq("planned_on", fra);
    if (flyttFeil) {
      throw new Error(`Kunne ikke flytte middagen: ${flyttFeil.message}`);
    }
    return true;
  }

  const { error: byttFeil } = await supabase.from("dinner_plans").upsert(
    [
      { planned_on: fra, dinner_id: maal.dinner_id },
      { planned_on: til, dinner_id: kilde.dinner_id },
    ],
    { onConflict: "user_id,planned_on" },
  );
  if (byttFeil) {
    throw new Error(`Kunne ikke bytte middagene: ${byttFeil.message}`);
  }
  return true;
}

// --- Matlagingsøkter (kokeboken) -------------------------------------------
// RLS begrenser øktene og avhukingene til innlogget bruker; spørringene
// filtrerer aldri på user_id selv. Varighet og «sist laget» avledes i
// src/lib/matlaging.ts – lagres aldri. Bare FERDIGE økter blir historikk:
// «Ferdig» eller siste avhukede steg lagrer tiden, «Avbryt» sletter økten
// (brukerens valg 27. sep 2026). Pausetid trekkes fra varigheten.

// Handling i en økt som alt er avsluttet (annen fane, eller siste steg
// avsluttet den) – oversettes til en forklarende melding.
export class OktenErAvsluttet extends Error {
  constructor() {
    super("Økten er allerede avsluttet.");
  }
}

// NB: select-strengene under må være bokstavelige (se MIDDAG_KOLONNER).
type OktRad = {
  id: string;
  dinner_id: string;
  started_at: string;
  ended_at: string | null;
  paused_at: string | null;
  paused_seconds: number;
};

function tilOkt(rad: OktRad): CookingSession {
  return {
    id: rad.id,
    dinnerId: rad.dinner_id,
    startedAt: rad.started_at,
    endedAt: rad.ended_at,
    pausedAt: rad.paused_at,
    pausedSeconds: rad.paused_seconds,
  };
}

// started_at settes av DB-klokken, ended_at/paused_at av serverens klokke.
// Et sekunds skjevhet og et lynraskt trykk skal ikke velte checken
// ended_at >= started_at – klem tidspunktet til minst starten.
function naaEtter(startedAt: string): string {
  return new Date(Math.max(Date.now(), Date.parse(startedAt))).toISOString();
}

// Sekunder fra et tidspunkt til et senere, aldri negativt.
function sekunderMellom(fra: string, til: string): number {
  return Math.max(0, Math.round((Date.parse(til) - Date.parse(fra)) / 1000));
}

// Feltene som avslutter en økt. Står den på pause, legges den pågående
// pausen til paused_seconds (DB-checken krever at en avsluttet økt ikke
// står på pause).
function avslutningsFelter(okt: OktRad) {
  const slutt = naaEtter(okt.started_at);
  return {
    ended_at: slutt,
    paused_at: null,
    paused_seconds:
      okt.paused_seconds +
      (okt.paused_at === null ? 0 : sekunderMellom(okt.paused_at, slutt)),
  };
}

// Leser en økt som MÅ pågå (pause, ferdig, avhuking). Mangler den, har
// RLS skjult den eller den er slettet – da er noe manipulert eller
// foreldet.
async function lesAktivOkt(
  supabase: ServerKlient,
  oktId: string,
): Promise<OktRad> {
  const { data, error } = await supabase
    .from("cooking_sessions")
    .select("id, dinner_id, started_at, ended_at, paused_at, paused_seconds")
    .eq("id", oktId)
    .maybeSingle();

  if (error) {
    throw new Error(`Kunne ikke lese økten: ${error.message}`);
  }
  if (data === null) {
    throw new Error(`Fant ingen økt (${oktId}).`);
  }
  if (data.ended_at !== null) {
    throw new OktenErAvsluttet();
  }
  return data;
}

// Alt matlagingsvisningen trenger for én middag. Den aktive økten er
// alltid nyest (unik-indeksen hindrer ny start før avslutning), så de 11
// nyeste radene gir den + 10 i historikken. «Laget N ganger» bruker den
// eksakte tellingen, aldri lengden på historikken.
export async function getMatlaging(dinnerId: string): Promise<MatlagingsData> {
  const supabase = await opprettServerKlient();
  const [okterSvar, antallSvar] = await Promise.all([
    supabase
      .from("cooking_sessions")
      .select(
        "id, dinner_id, started_at, ended_at, paused_at, paused_seconds, cooking_session_steps(step_id)",
      )
      .eq("dinner_id", dinnerId)
      .order("started_at", { ascending: false })
      .limit(11),
    supabase
      .from("cooking_sessions")
      .select("id", { count: "exact", head: true })
      .eq("dinner_id", dinnerId)
      .not("ended_at", "is", null),
  ]);

  if (okterSvar.error) {
    throw new Error(`Kunne ikke hente øktene: ${okterSvar.error.message}`);
  }
  if (antallSvar.error) {
    throw new Error(`Kunne ikke telle øktene: ${antallSvar.error.message}`);
  }

  const rader = okterSvar.data ?? [];
  const aktiv = rader.find((rad) => rad.ended_at === null) ?? null;
  return {
    aktivOkt: aktiv === null ? null : tilOkt(aktiv),
    gjorteStegIder:
      aktiv === null
        ? []
        : aktiv.cooking_session_steps.map((gjort) => gjort.step_id),
    historikk: rader
      .filter((rad) => rad.ended_at !== null)
      .slice(0, 10)
      .map(tilOkt),
    antallOkter: antallSvar.count ?? 0,
  };
}

// Avsluttede økter nyest først – kokebok-listen reduserer dem til «sist
// laget» per rett (sisteOktPerMiddag). Taket på 1 000 økter betyr at en
// rett som ikke er laget blant de siste 1 000 vises som «aldri laget» –
// akseptert (flere års daglig matlaging). Blir det reelt, er veien en
// view med distinct on (user_id, dinner_id) og security_invoker = true.
export async function getAvsluttedeOkter(): Promise<CookingSession[]> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("cooking_sessions")
    .select("id, dinner_id, started_at, ended_at, paused_at, paused_seconds")
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(MAKS_RADER);

  if (error) {
    throw new Error(`Kunne ikke hente øktene: ${error.message}`);
  }

  return (data ?? []).map(tilOkt);
}

// «Start matlaging». Delvis unik indeks (user_id, dinner_id) der ended_at
// er null: finnes det alt en pågående økt (annen fane, dobbelttrykk),
// gjenopptas den i stedet for å feile.
export async function startOkt(dinnerId: string): Promise<string> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("cooking_sessions")
    .insert({ dinner_id: dinnerId })
    .select("id")
    .single();

  if (error?.code === "23505") {
    const { data: aktiv, error: lesFeil } = await supabase
      .from("cooking_sessions")
      .select("id")
      .eq("dinner_id", dinnerId)
      .is("ended_at", null)
      .maybeSingle();
    if (lesFeil !== null || aktiv === null) {
      throw new Error(
        `Kunne ikke gjenoppta økten: ${lesFeil?.message ?? "fant den ikke"}`,
      );
    }
    return aktiv.id;
  }
  if (error !== null || data === null) {
    throw new Error(`Kunne ikke starte økten: ${error?.message}`);
  }
  return data.id;
}

// «Pause». Idempotent: en økt som alt står på pause, røres ikke.
export async function pauseOkt(oktId: string): Promise<void> {
  const supabase = await opprettServerKlient();
  const okt = await lesAktivOkt(supabase, oktId);
  if (okt.paused_at !== null) {
    return;
  }

  const { error } = await supabase
    .from("cooking_sessions")
    .update({ paused_at: naaEtter(okt.started_at) })
    .eq("id", oktId)
    .is("ended_at", null)
    .is("paused_at", null);
  if (error) {
    throw new Error(`Kunne ikke sette økten på pause: ${error.message}`);
  }
}

// «Fortsett». Den avsluttede pausen legges til paused_seconds.
// Idempotent: en økt som går, røres ikke.
export async function fortsettOkt(oktId: string): Promise<void> {
  const supabase = await opprettServerKlient();
  const okt = await lesAktivOkt(supabase, oktId);
  if (okt.paused_at === null) {
    return;
  }

  const { error } = await supabase
    .from("cooking_sessions")
    .update({
      paused_at: null,
      paused_seconds:
        okt.paused_seconds + sekunderMellom(okt.paused_at, naaEtter(okt.paused_at)),
    })
    .eq("id", oktId)
    .is("ended_at", null)
    .not("paused_at", "is", null);
  if (error) {
    throw new Error(`Kunne ikke fortsette økten: ${error.message}`);
  }
}

// «Ferdig» – lagrer tiden (økten blir historikk).
export async function avsluttOkt(oktId: string): Promise<void> {
  const supabase = await opprettServerKlient();
  const okt = await lesAktivOkt(supabase, oktId);

  const { data, error } = await supabase
    .from("cooking_sessions")
    .update(avslutningsFelter(okt))
    .eq("id", oktId)
    .is("ended_at", null)
    .select("id");

  if (error) {
    throw new Error(`Kunne ikke avslutte økten: ${error.message}`);
  }
  if (!data || data.length === 0) {
    // Avsluttet mellom lesingen og oppdateringen (kappløp med en annen fane).
    throw new OktenErAvsluttet();
  }
}

// «Avbryt» (pågående økt) og «Slett» (rad i historikken): økter er
// loggrader (goal_entries-presedensen), ikke katalog – de slettes, så en
// avbrutt eller feilaktig økt aldri forurenser «sist laget».
// Avhukingene går med i kaskaden.
export async function slettOkt(oktId: string): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("cooking_sessions")
    .delete()
    .eq("id", oktId)
    .select("id");

  if (error) {
    throw new Error(`Kunne ikke slette økten: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(`Fant ingen økt å slette (${oktId}).`);
  }
}

// Huker av et steg. Når alle oppskriftens steg er huket av, avsluttes
// økten i samme kall – DETTE er regelen «timeren stopper på siste steg»,
// ett sted, på serveren. Dobbelttrykk er ufarlig: 23505 på (økt, steg)
// betyr at steget alt er gjort.
export async function settStegGjort(
  oktId: string,
  stegId: string,
): Promise<{ ferdig: boolean }> {
  const supabase = await opprettServerKlient();
  const okt = await lesAktivOkt(supabase, oktId);

  const { error } = await supabase
    .from("cooking_session_steps")
    .insert({ session_id: oktId, step_id: stegId });
  if (error !== null && error.code !== "23505") {
    throw new Error(`Kunne ikke huke av steget: ${error.message}`);
  }

  const [stegSvar, gjortSvar] = await Promise.all([
    supabase
      .from("dinner_steps")
      .select("id", { count: "exact", head: true })
      .eq("dinner_id", okt.dinner_id),
    supabase
      .from("cooking_session_steps")
      .select("step_id", { count: "exact", head: true })
      .eq("session_id", oktId),
  ]);
  if (stegSvar.error || gjortSvar.error) {
    throw new Error(
      `Kunne ikke telle stegene: ${(stegSvar.error ?? gjortSvar.error)?.message}`,
    );
  }

  const antallSteg = stegSvar.count ?? 0;
  const antallGjort = gjortSvar.count ?? 0;
  if (antallSteg === 0 || antallGjort < antallSteg) {
    return { ferdig: false };
  }

  const { error: sluttFeil } = await supabase
    .from("cooking_sessions")
    .update(avslutningsFelter(okt))
    .eq("id", oktId)
    .is("ended_at", null);
  if (sluttFeil) {
    throw new Error(`Kunne ikke avslutte økten: ${sluttFeil.message}`);
  }
  return { ferdig: true };
}

// Tar bort en avhuking (kun mens økten pågår).
export async function fjernStegGjort(
  oktId: string,
  stegId: string,
): Promise<void> {
  const supabase = await opprettServerKlient();
  await lesAktivOkt(supabase, oktId);

  const { error } = await supabase
    .from("cooking_session_steps")
    .delete()
    .eq("session_id", oktId)
    .eq("step_id", stegId);
  if (error) {
    throw new Error(`Kunne ikke fjerne avhukingen: ${error.message}`);
  }
}
