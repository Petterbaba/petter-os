import type {
  Dinner,
  DinnerPlan,
  FoodItem,
  FoodPortion,
} from "@/lib/types";
import type { Json } from "@/lib/database.types";
import { opprettServerKlient } from "@/lib/supabase/server";

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
  "id, name, kcal_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, portions";

// NB: må være ÉN bokstavelig streng – supabase-js parser select-strengen på
// typenivå, og sammensetting («+»/template) kollapser typene til feil.
const MIDDAG_KOLONNER =
  "id, title, servings, instructions, notes, oda_recipe_id, source_url, dinner_ingredients(id, label, amount_grams, position, food_items(id, name, kcal_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, portions))";

type MatvareRad = {
  id: string;
  name: string;
  kcal_per_100g: number;
  protein_per_100g: number | null;
  fat_per_100g: number | null;
  carbs_per_100g: number | null;
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
    portions: tilPorsjoner(rad.portions),
  };
}

export async function getMiddager(): Promise<Dinner[]> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("dinners")
    .select(MIDDAG_KOLONNER)
    .is("archived_at", null)
    .order("title")
    .limit(MAKS_RADER);

  if (error) {
    throw new Error(`Kunne ikke hente middager: ${error.message}`);
  }

  return (data ?? []).map((rad) => ({
    id: rad.id,
    title: rad.title,
    servings: rad.servings,
    instructions: rad.instructions,
    notes: rad.notes,
    odaRecipeId: rad.oda_recipe_id,
    sourceUrl: rad.source_url,
    ingredients: rad.dinner_ingredients
      .map((ingrediens) => ({
        id: ingrediens.id,
        label: ingrediens.label,
        amountGrams: ingrediens.amount_grams,
        position: ingrediens.position,
        foodItem:
          ingrediens.food_items === null
            ? null
            : tilMatvare(ingrediens.food_items),
      }))
      .sort((a, b) => a.position - b.position),
  }));
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

export type NyIngrediens = {
  label: string;
  amountGrams: number | null;
  foodItemId: string | null;
};

export type NyMiddag = {
  title: string;
  servings: number;
  instructions: string | null;
  notes: string | null;
  odaRecipeId: string | null;
  sourceUrl: string | null;
  ingredients: NyIngrediens[];
};

type ServerKlient = Awaited<ReturnType<typeof opprettServerKlient>>;

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
      amount_grams: rad.amountGrams,
      food_item_id: rad.foodItemId,
      position: indeks,
    })),
  );
  return error;
}

export async function lagreMiddag(middag: NyMiddag): Promise<string> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("dinners")
    .insert({
      title: middag.title,
      servings: middag.servings,
      instructions: middag.instructions,
      notes: middag.notes,
      oda_recipe_id: middag.odaRecipeId,
      source_url: middag.sourceUrl,
    })
    .select("id")
    .single();

  if (error?.code === "23505") {
    throw new MiddagAlleredeImportert();
  }
  if (error !== null || data === null) {
    throw new Error(`Kunne ikke lagre middagen: ${error?.message}`);
  }

  // PostgREST har ingen transaksjoner: feiler ingrediens-innsettingen,
  // ryddes middagen bort igjen så katalogen aldri viser en halv oppskrift.
  const ingrediensFeil = await settInnIngredienser(
    supabase,
    data.id,
    middag.ingredients,
  );
  if (ingrediensFeil !== null) {
    await supabase.from("dinners").delete().eq("id", data.id);
    throw new Error(`Kunne ikke lagre ingrediensene: ${ingrediensFeil.message}`);
  }

  return data.id;
}

// Oppdatering skjer alltid via id (journal-mønsteret). Ingrediensene
// erstattes samlet (slett + sett inn på nytt) – skulle innsettingen feile,
// står middagen uten ingredienser til neste lagring reparerer den.
export async function oppdaterMiddag(
  id: string,
  middag: NyMiddag,
): Promise<void> {
  const supabase = await opprettServerKlient();
  const { data, error } = await supabase
    .from("dinners")
    .update({
      title: middag.title,
      servings: middag.servings,
      instructions: middag.instructions,
      notes: middag.notes,
      oda_recipe_id: middag.odaRecipeId,
      source_url: middag.sourceUrl,
    })
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
