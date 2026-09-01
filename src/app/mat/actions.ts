"use server";

import { revalidatePath } from "next/cache";
import {
  arkiverMiddag,
  fjernPlanlagtMiddag,
  lagreMiddag,
  MiddagAlleredeImportert,
  oppdaterMiddag,
  planleggMiddag,
  sokMatvarer,
  type NyIngrediens,
} from "@/lib/data/mat";
import { erGyldigIsoDato, parseNorskTall } from "@/lib/validering";
import type { ActionResultat } from "@/lib/actions";

// DB håndhever det generiske (ikke-tom tittel, porsjoner > 0, gram > 0);
// presise grenser og meldinger bor her (reise-mønsteret).
const MAKS_TITTEL = 200;
const MAKS_TEKST = 20_000;
const MAKS_KILDE = 500;
const MAKS_ODA_ID = 50;
const MAKS_PORSJONER = 50;
const MAKS_INGREDIENSER = 100;
const MAKS_INGREDIENS_NAVN = 200;
const MAKS_GRAM = 100_000;
const MAKS_SOK = 100;
const UUID_MONSTER =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ingrediensradene er dynamiske (klienten eier radlisten), så de sendes
// som JSON i ett skjult felt i stedet for nummererte feltnavn – og
// valideres her like strengt som vanlige felt.
function parseIngredienser(
  raa: string,
): { ok: true; ingredienser: NyIngrediens[] } | { ok: false; melding: string } {
  let liste: unknown;
  try {
    liste = JSON.parse(raa === "" ? "[]" : raa);
  } catch {
    return { ok: false, melding: "Kunne ikke lagre middagen. Prøv igjen." };
  }
  if (!Array.isArray(liste)) {
    return { ok: false, melding: "Kunne ikke lagre middagen. Prøv igjen." };
  }
  if (liste.length > MAKS_INGREDIENSER) {
    return {
      ok: false,
      melding: `Maks ${MAKS_INGREDIENSER} ingredienser.`,
    };
  }

  const ingredienser: NyIngrediens[] = [];
  for (const rad of liste) {
    if (rad === null || typeof rad !== "object" || Array.isArray(rad)) {
      return { ok: false, melding: "Kunne ikke lagre middagen. Prøv igjen." };
    }
    const post = rad as Record<string, unknown>;
    const label = typeof post.label === "string" ? post.label.trim() : "";
    const mengdeRaa = typeof post.mengde === "string" ? post.mengde.trim() : "";
    const foodItemId = post.foodItemId;

    if (label === "") {
      return { ok: false, melding: "Hver ingrediens må ha et navn." };
    }
    if (label.length > MAKS_INGREDIENS_NAVN) {
      return {
        ok: false,
        melding: `Ingrediensnavn kan være maks ${MAKS_INGREDIENS_NAVN} tegn.`,
      };
    }

    let gram: number | null = null;
    if (mengdeRaa !== "") {
      const tall = parseNorskTall(mengdeRaa);
      if (tall === null || tall <= 0) {
        return {
          ok: false,
          melding: `Mengden for «${label}» må være gram (et tall over 0) – eller stå tom for «etter smak».`,
        };
      }
      if (tall > MAKS_GRAM) {
        return { ok: false, melding: `Mengden for «${label}» er urimelig stor.` };
      }
      gram = Math.round(tall * 10) / 10;
    }

    if (foodItemId !== null && (typeof foodItemId !== "string" || !UUID_MONSTER.test(foodItemId))) {
      return { ok: false, melding: "Kunne ikke lagre middagen. Prøv igjen." };
    }

    ingredienser.push({
      label,
      amountGrams: gram,
      foodItemId: foodItemId === null ? null : (foodItemId as string),
    });
  }
  return { ok: true, ingredienser };
}

export async function lagreMiddagAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  // Skjult id-felt = redigering; tomt = ny middag. Skjult odaid-felt følger
  // med ved redigering av importerte retter så kildekoblingen overlever.
  const id = String(formData.get("id") ?? "").trim();
  const odaId = String(formData.get("odaid") ?? "").trim();
  const tittel = String(formData.get("tittel") ?? "").trim();
  const porsjonerRaa = String(formData.get("porsjoner") ?? "").trim();
  const fremgangsmate = String(formData.get("fremgangsmate") ?? "").trim();
  const notater = String(formData.get("notater") ?? "").trim();
  const kilde = String(formData.get("kilde") ?? "").trim();
  const ingredienserRaa = String(formData.get("ingredienser") ?? "").trim();
  // Ved feil sendes input tilbake så skjemaet kan bevare det
  // (React 19 nullstiller ukontrollerte felt når actionen fullfører).
  // Ingrediensradene er klient-state og trenger ikke rundturen.
  const verdier = {
    tittel,
    porsjoner: porsjonerRaa,
    fremgangsmate,
    notater,
    kilde,
  };

  if (id !== "" && !UUID_MONSTER.test(id)) {
    // Manipulert skjult felt – ikke noe brukeren kan rette selv.
    return { ok: false, melding: "Kunne ikke lagre middagen. Prøv igjen.", verdier };
  }
  if (odaId.length > MAKS_ODA_ID) {
    return { ok: false, melding: "Kunne ikke lagre middagen. Prøv igjen.", verdier };
  }
  if (tittel === "") {
    return { ok: false, melding: "Tittelen kan ikke være tom.", verdier };
  }
  if (tittel.length > MAKS_TITTEL) {
    return {
      ok: false,
      melding: `Tittelen kan være maks ${MAKS_TITTEL} tegn.`,
      verdier,
    };
  }

  const porsjoner = Number(porsjonerRaa);
  if (!Number.isInteger(porsjoner) || porsjoner < 1 || porsjoner > MAKS_PORSJONER) {
    return {
      ok: false,
      melding: `Porsjoner må være et helt tall fra 1 til ${MAKS_PORSJONER}.`,
      verdier,
    };
  }

  if (fremgangsmate.length > MAKS_TEKST || notater.length > MAKS_TEKST) {
    return {
      ok: false,
      melding: `Tekstfeltene kan være maks ${MAKS_TEKST} tegn.`,
      verdier,
    };
  }

  if (kilde !== "") {
    if (kilde.length > MAKS_KILDE) {
      return {
        ok: false,
        melding: `Kilden kan være maks ${MAKS_KILDE} tegn.`,
        verdier,
      };
    }
    let gyldig = false;
    try {
      const url = new URL(kilde);
      gyldig = url.protocol === "https:" || url.protocol === "http:";
    } catch {
      gyldig = false;
    }
    if (!gyldig) {
      return {
        ok: false,
        melding: "Kilden må være en gyldig lenke (https://…).",
        verdier,
      };
    }
  }

  const parset = parseIngredienser(ingredienserRaa);
  if (!parset.ok) {
    return { ok: false, melding: parset.melding, verdier };
  }

  const felter = {
    title: tittel,
    servings: porsjoner,
    instructions: fremgangsmate === "" ? null : fremgangsmate,
    notes: notater === "" ? null : notater,
    odaRecipeId: odaId === "" ? null : odaId,
    sourceUrl: kilde === "" ? null : kilde,
    ingredients: parset.ingredienser,
  };

  try {
    if (id === "") {
      await lagreMiddag(felter);
    } else {
      await oppdaterMiddag(id, felter);
    }
  } catch (feil) {
    if (feil instanceof MiddagAlleredeImportert) {
      return {
        ok: false,
        melding: "Oppskriften er allerede i katalogen.",
        verdier,
      };
    }
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Lagring av middag feilet:", feil);
    return { ok: false, melding: "Kunne ikke lagre middagen. Prøv igjen.", verdier };
  }

  revalidatePath("/mat");
  return {
    ok: true,
    melding: id === "" ? "Middag lagret." : "Middag oppdatert.",
  };
}

export async function arkiverMiddagAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const id = String(formData.get("id") ?? "").trim();
  if (!UUID_MONSTER.test(id)) {
    return { ok: false, melding: "Kunne ikke arkivere middagen. Prøv igjen." };
  }

  try {
    await arkiverMiddag(id);
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Arkivering av middag feilet:", feil);
    return { ok: false, melding: "Kunne ikke arkivere middagen. Prøv igjen." };
  }

  revalidatePath("/mat");
  return { ok: true, melding: "Middag arkivert." };
}

export async function planleggMiddagAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const dato = String(formData.get("dato") ?? "").trim();
  const middag = String(formData.get("middag") ?? "").trim();

  if (!erGyldigIsoDato(dato)) {
    return { ok: false, melding: "Ugyldig dato." };
  }
  if (middag !== "" && !UUID_MONSTER.test(middag)) {
    return { ok: false, melding: "Kunne ikke oppdatere ukesplanen. Prøv igjen." };
  }

  try {
    if (middag === "") {
      await fjernPlanlagtMiddag(dato);
    } else {
      await planleggMiddag(dato, middag);
    }
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Oppdatering av ukesplan feilet:", feil);
    return { ok: false, melding: "Kunne ikke oppdatere ukesplanen. Prøv igjen." };
  }

  revalidatePath("/mat");
  return { ok: true, melding: "Ukesplan oppdatert." };
}

// Kalles imperativt fra MiddagSkjema (React 19 server function) for
// matvare-mappingen – returnerer data, ikke ActionResultat. Lesing er
// beskyttet av auth/RLS som alt annet (server-klienten leser cookies).
export async function sokMatvarerAction(
  sok: unknown,
): Promise<
  | { ok: true; matvarer: { id: string; name: string; kcalPer100g: number }[] }
  | { ok: false; melding: string }
> {
  if (typeof sok !== "string" || sok.trim().length < 2) {
    return { ok: false, melding: "Skriv minst to tegn." };
  }
  if (sok.length > MAKS_SOK) {
    return { ok: false, melding: "Søket er for langt." };
  }

  try {
    const matvarer = await sokMatvarer(sok);
    return {
      ok: true,
      matvarer: matvarer.map((matvare) => ({
        id: matvare.id,
        name: matvare.name,
        kcalPer100g: matvare.kcalPer100g,
      })),
    };
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Matvaresøk feilet:", feil);
    return { ok: false, melding: "Søket feilet. Prøv igjen." };
  }
}
