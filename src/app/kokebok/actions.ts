"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  arkiverMiddag,
  avsluttOkt,
  fjernStegGjort,
  fortsettOkt,
  lagreMiddag,
  MiddagAlleredeImportert,
  OktenErAvsluttet,
  oppdaterMiddag,
  pauseOkt,
  settStegGjort,
  slettOkt,
  sokMatvarer,
  sokOdaProdukter,
  startOkt,
  type NyIngrediens,
  type NyMiddag,
} from "@/lib/data/mat";
import { erUuid, parseNorskTall } from "@/lib/validering";
import { erEnhet } from "@/lib/enheter";
import { erVanskelighet } from "@/lib/matlaging";
import type { ActionResultat } from "@/lib/actions";

// Kokebokens server actions: oppskriftseditoren (flyttet hit fra /mat –
// én editor for begge sidene) og matlagingsøktene. DB håndhever det
// generiske (ikke-tom tittel, porsjoner > 0, mengde > 0, tid > 0);
// presise grenser og meldinger bor her (reise-mønsteret).
const MAKS_TITTEL = 200;
const MAKS_TEKST = 20_000; // notater
const MAKS_KILDE = 500;
const MAKS_ODA_ID = 50;
const MAKS_PORSJONER = 50;
const MAKS_INGREDIENSER = 100;
const MAKS_INGREDIENS_NAVN = 200;
const MAKS_MENGDE = 100_000;
const MAKS_SOK = 100;
const MAKS_STEG = 50;
const MAKS_STEG_TEKST = 2_000;
// Én uke. Oda oppgir alt «P1DT00H00M00S» (1 440 min, pizzadeig), og en
// rett importert med lengre hviletid via direkte DB-tilkobling skal kunne
// lagres på nytt i editoren uten å måtte endre tiden.
const MAKS_TID = 10_080;

const LAGRING_FEILET = "Kunne ikke lagre oppskriften. Prøv igjen.";

// Tall i meldinger med norsk tusenskille («10 080»). Kjører kun på serveren.
function tall(verdi: number): string {
  return verdi.toLocaleString("nb-NO");
}

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
    return { ok: false, melding: LAGRING_FEILET };
  }
  if (!Array.isArray(liste)) {
    return { ok: false, melding: LAGRING_FEILET };
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
      return { ok: false, melding: LAGRING_FEILET };
    }
    const post = rad as Record<string, unknown>;
    const label = typeof post.label === "string" ? post.label.trim() : "";
    const mengdeRaa = typeof post.mengde === "string" ? post.mengde.trim() : "";
    const enhetRaa = typeof post.enhet === "string" ? post.enhet : "";
    const foodItemId = post.foodItemId;
    const odaProduktId = post.odaProduktId;

    if (label === "") {
      return { ok: false, melding: "Hver ingrediens må ha et navn." };
    }
    if (label.length > MAKS_INGREDIENS_NAVN) {
      return {
        ok: false,
        melding: `Ingrediensnavn kan være maks ${MAKS_INGREDIENS_NAVN} tegn.`,
      };
    }
    if (!erEnhet(enhetRaa)) {
      // Manipulert felt – selecten tilbyr kun gyldige enheter.
      return { ok: false, melding: LAGRING_FEILET };
    }

    let mengde: number | null = null;
    if (mengdeRaa !== "") {
      const verdi = parseNorskTall(mengdeRaa);
      if (verdi === null || verdi <= 0) {
        return {
          ok: false,
          melding: `Mengden for «${label}» må være et tall over 0 – eller stå tom for «etter smak».`,
        };
      }
      if (verdi > MAKS_MENGDE) {
        return { ok: false, melding: `Mengden for «${label}» er urimelig stor.` };
      }
      mengde = Math.round(verdi * 10) / 10;
    }

    if (
      foodItemId !== null &&
      (typeof foodItemId !== "string" || !erUuid(foodItemId))
    ) {
      return { ok: false, melding: LAGRING_FEILET };
    }
    // Oda-produkt-id-er er heltall hos kilden; lagres som tekst
    // (oda_recipe_id-presedensen).
    if (
      odaProduktId !== null &&
      (typeof odaProduktId !== "string" || !/^\d{1,20}$/.test(odaProduktId))
    ) {
      return { ok: false, melding: LAGRING_FEILET };
    }

    ingredienser.push({
      label,
      amount: mengde,
      unit: enhetRaa,
      odaProductId: odaProduktId === null ? null : (odaProduktId as string),
      foodItemId: foodItemId === null ? null : (foodItemId as string),
    });
  }
  return { ok: true, ingredienser };
}

// Stegene sendes som JSON-liste av tekster i rekkefølge. Tomme steg
// droppes stille – i motsetning til ingrediensene, der en tom rad feiler
// fordi et navnløst produktvalg ellers ville gått tapt; et tomt steg
// bærer ingen informasjon.
function parseSteg(
  raa: string,
): { ok: true; steg: string[] } | { ok: false; melding: string } {
  let liste: unknown;
  try {
    liste = JSON.parse(raa === "" ? "[]" : raa);
  } catch {
    return { ok: false, melding: LAGRING_FEILET };
  }
  if (
    !Array.isArray(liste) ||
    liste.some((element) => typeof element !== "string")
  ) {
    return { ok: false, melding: LAGRING_FEILET };
  }

  const steg = (liste as string[])
    .map((tekst) => tekst.trim())
    .filter((tekst) => tekst !== "");
  if (steg.length > MAKS_STEG) {
    return { ok: false, melding: `Maks ${MAKS_STEG} steg.` };
  }
  const forLangt = steg.findIndex((tekst) => tekst.length > MAKS_STEG_TEKST);
  if (forLangt !== -1) {
    return {
      ok: false,
      melding: `Steg ${forLangt + 1} kan være maks ${tall(MAKS_STEG_TEKST)} tegn.`,
    };
  }
  return { ok: true, steg };
}

// Oppskriftseditoren (/kokebok/ny og /kokebok/[id]/rediger). Skjult
// id-felt = redigering; tomt = ny oppskrift. Skjult odaid-felt MÅ følge
// med ved redigering av importerte retter – ellers nullstilles
// oda_recipe_id og «Legg i Oda-kurven» slutter å virke for retten.
// Vellykket lagring sender til oppskriften (redirect er kvitteringen).
export async function lagreOppskriftAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const id = String(formData.get("id") ?? "").trim();
  const odaId = String(formData.get("odaid") ?? "").trim();
  const tittel = String(formData.get("tittel") ?? "").trim();
  const porsjonerRaa = String(formData.get("porsjoner") ?? "").trim();
  const tidRaa = String(formData.get("tid") ?? "").trim();
  const vanskelighetRaa = String(formData.get("vanskelighet") ?? "").trim();
  const notater = String(formData.get("notater") ?? "").trim();
  const kilde = String(formData.get("kilde") ?? "").trim();
  const ingredienserRaa = String(formData.get("ingredienser") ?? "").trim();
  const stegRaa = String(formData.get("steg") ?? "").trim();
  // Ved feil sendes input tilbake så skjemaet kan bevare det
  // (React 19 nullstiller ukontrollerte felt når actionen fullfører).
  // Ingrediens- og stegradene er klient-state og trenger ikke rundturen.
  const verdier = {
    tittel,
    porsjoner: porsjonerRaa,
    tid: tidRaa,
    vanskelighet: vanskelighetRaa,
    notater,
    kilde,
  };

  if (id !== "" && !erUuid(id)) {
    // Manipulert skjult felt – ikke noe brukeren kan rette selv.
    return { ok: false, melding: LAGRING_FEILET, verdier };
  }
  if (odaId.length > MAKS_ODA_ID) {
    return { ok: false, melding: LAGRING_FEILET, verdier };
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

  let tid: number | null = null;
  if (tidRaa !== "") {
    tid = Number(tidRaa);
    if (!Number.isInteger(tid) || tid < 1 || tid > MAKS_TID) {
      return {
        ok: false,
        melding: `Tiden må være et helt antall minutter fra 1 til ${tall(MAKS_TID)}.`,
        verdier,
      };
    }
  }

  if (vanskelighetRaa !== "" && !erVanskelighet(vanskelighetRaa)) {
    // Manipulert felt – selecten tilbyr kun gyldige verdier.
    return { ok: false, melding: LAGRING_FEILET, verdier };
  }
  const vanskelighet = erVanskelighet(vanskelighetRaa) ? vanskelighetRaa : null;

  if (notater.length > MAKS_TEKST) {
    return {
      ok: false,
      melding: `Notatene kan være maks ${tall(MAKS_TEKST)} tegn.`,
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

  const ingredienser = parseIngredienser(ingredienserRaa);
  if (!ingredienser.ok) {
    return { ok: false, melding: ingredienser.melding, verdier };
  }
  const steg = parseSteg(stegRaa);
  if (!steg.ok) {
    return { ok: false, melding: steg.melding, verdier };
  }

  const felter: NyMiddag = {
    title: tittel,
    servings: porsjoner,
    cookMinutes: tid,
    difficulty: vanskelighet,
    notes: notater === "" ? null : notater,
    odaRecipeId: odaId === "" ? null : odaId,
    sourceUrl: kilde === "" ? null : kilde,
    ingredients: ingredienser.ingredienser,
    steps: steg.steg,
  };

  let lagretId: string;
  try {
    if (id === "") {
      lagretId = await lagreMiddag(felter);
    } else {
      await oppdaterMiddag(id, felter);
      lagretId = id;
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
    console.error("Lagring av oppskrift feilet:", feil);
    return { ok: false, melding: LAGRING_FEILET, verdier };
  }

  // revalidatePath før redirect; redirect kaster NEXT_REDIRECT og må stå
  // utenfor try/catch (Next 16-dokumentasjonen, logg-inn-presedensen).
  revalidatePath("/mat");
  revalidatePath("/kokebok");
  revalidatePath(`/kokebok/${lagretId}`);
  revalidatePath(`/kokebok/${lagretId}/rediger`);
  redirect(`/kokebok/${lagretId}`);
}

// Katalogregelen: oppskrifter arkiveres, slettes aldri – ukesplan-
// historikken beholder referansen, og dager med retten blir tomme.
export async function arkiverOppskriftAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const id = String(formData.get("id") ?? "").trim();
  if (!erUuid(id)) {
    return { ok: false, melding: "Kunne ikke arkivere oppskriften. Prøv igjen." };
  }

  try {
    await arkiverMiddag(id);
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Arkivering av oppskrift feilet:", feil);
    return { ok: false, melding: "Kunne ikke arkivere oppskriften. Prøv igjen." };
  }

  revalidatePath("/mat");
  revalidatePath("/kokebok");
  revalidatePath(`/kokebok/${id}`);
  redirect("/kokebok");
}

// --- Matlagingsøkter --------------------------------------------------------
// Bare FERDIGE økter blir historikk: «Ferdig» eller siste avhukede steg
// lagrer tiden, «Avbryt» sletter økten (brukerens valg 27. sep 2026).
// Skjemaene sender middagens id i tillegg til øktens, så siden kan
// revalideres også når økten alt er avsluttet i en annen fane (da vet
// datalaget ikke hvilken middag det gjaldt). Id-en brukes KUN til
// revalidering – hvilken økt og hvilket steg som endres, avgjør serveren.

function lesOktFelt(formData: FormData) {
  const okt = String(formData.get("okt") ?? "").trim();
  const middag = String(formData.get("middag") ?? "").trim();
  return erUuid(okt) && erUuid(middag) ? { okt, middag } : null;
}

export async function startOktAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const middag = String(formData.get("middag") ?? "").trim();
  if (!erUuid(middag)) {
    return { ok: false, melding: "Kunne ikke starte matlagingen. Prøv igjen." };
  }

  try {
    await startOkt(middag);
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Start av matlagingsøkt feilet:", feil);
    return { ok: false, melding: "Kunne ikke starte matlagingen. Prøv igjen." };
  }

  revalidatePath(`/kokebok/${middag}`);
  return { ok: true };
}

// Felles gang for økt-handlingene: valider feltene, kjør handlingen,
// oversett OktenErAvsluttet, revalider siden – og kokebok-listen når
// «sist laget» kan ha endret seg.
async function oktHandling(
  formData: FormData,
  handling: (oktId: string) => Promise<void>,
  {
    feilmelding,
    endrerHistorikk,
  }: { feilmelding: string; endrerHistorikk: boolean },
): Promise<ActionResultat> {
  const felt = lesOktFelt(formData);
  if (felt === null) {
    return { ok: false, melding: feilmelding };
  }

  let resultat: ActionResultat = { ok: true };
  try {
    await handling(felt.okt);
  } catch (feil) {
    if (feil instanceof OktenErAvsluttet) {
      resultat = { ok: false, melding: "Økten er allerede avsluttet." };
    } else {
      // Generisk melding i UI; detaljer kun i serverloggen.
      console.error("Matlagingsøkt feilet:", feil);
      return { ok: false, melding: feilmelding };
    }
  }

  revalidatePath(`/kokebok/${felt.middag}`);
  if (endrerHistorikk || !resultat.ok) {
    revalidatePath("/kokebok");
  }
  return resultat;
}

// «Ferdig» – lagrer tiden i historikken.
export async function avsluttOktAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  return oktHandling(formData, avsluttOkt, {
    feilmelding: "Kunne ikke lagre økten. Prøv igjen.",
    endrerHistorikk: true,
  });
}

export async function pauseOktAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  return oktHandling(formData, pauseOkt, {
    feilmelding: "Kunne ikke sette på pause. Prøv igjen.",
    endrerHistorikk: false,
  });
}

export async function fortsettOktAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  return oktHandling(formData, fortsettOkt, {
    feilmelding: "Kunne ikke fortsette. Prøv igjen.",
    endrerHistorikk: false,
  });
}

// «Avbryt» (pågående økt – tiden lagres ikke) og «Slett» (rad i
// historikken). Begge sletter økten.
export async function slettOktAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  return oktHandling(formData, slettOkt, {
    feilmelding: "Kunne ikke fjerne økten. Prøv igjen.",
    endrerHistorikk: true,
  });
}

// Huk av / ta bort et steg. «gjort» = målverdien («1» huk av, «0» ta
// bort) – idempotent, ikke toggle, så et dobbelttrykk aldri snur tilbake.
// Siste avhukede steg avslutter økten (settStegGjort).
export async function settStegAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const felt = lesOktFelt(formData);
  const steg = String(formData.get("steg") ?? "").trim();
  const gjort = String(formData.get("gjort") ?? "").trim();
  if (felt === null || !erUuid(steg) || (gjort !== "1" && gjort !== "0")) {
    return { ok: false, melding: "Kunne ikke oppdatere steget. Prøv igjen." };
  }

  let ferdig = false;
  let resultat: ActionResultat = { ok: true };
  try {
    if (gjort === "1") {
      ({ ferdig } = await settStegGjort(felt.okt, steg));
    } else {
      await fjernStegGjort(felt.okt, steg);
    }
    if (ferdig) {
      resultat = { ok: true, melding: "Ferdig – tiden er lagret." };
    }
  } catch (feil) {
    if (feil instanceof OktenErAvsluttet) {
      resultat = {
        ok: false,
        melding: "Økten er avsluttet – start en ny for å huke av.",
      };
    } else {
      // Generisk melding i UI; detaljer kun i serverloggen.
      console.error("Avhuking av steg feilet:", feil);
      return { ok: false, melding: "Kunne ikke oppdatere steget. Prøv igjen." };
    }
  }

  revalidatePath(`/kokebok/${felt.middag}`);
  if (ferdig || !resultat.ok) {
    revalidatePath("/kokebok");
  }
  return resultat;
}

// --- Ingrediens-søkene i editoren ------------------------------------------

// Kalles imperativt fra IngrediensRader (React 19 server function) for
// matvare-mappingen – returnerer data, ikke ActionResultat. Lesing er
// beskyttet av auth/RLS som alt annet (server-klienten leser cookies).
export async function sokMatvarerAction(
  sok: unknown,
): Promise<
  | {
      ok: true;
      matvarer: {
        id: string;
        name: string;
        kcalPer100g: number;
        proteinPer100g: number | null;
      }[];
    }
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
        proteinPer100g: matvare.proteinPer100g,
      })),
    };
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Matvaresøk feilet:", feil);
    return { ok: false, melding: "Søket feilet. Prøv igjen." };
  }
}

// Ett produkttreff fra den LOKALE Oda-katalogen. Prisene er katalogens
// tidsstemplede cache og VISES kun – raden lagrer bare produkt-id-en som
// kildereferanse (oda_recipe_id-presedensen).
export type OdaProduktTreff = {
  id: string;
  name: string;
  brand: string | null;
  description: string; // pakkebeskrivelse («2 stk, 375 g»)
  price: number | null;
  unitPrice: number | null; // kr per enhet under
  unitPriceUnit: string | null; // «kg», «l», «stk»
};

// Kalles imperativt fra IngrediensRader (autosøk med debounce): søker i
// den LOKALE katalogen (oda_products, speilet nattlig av synk-scriptet) –
// raskt, stabilt og uten Oda-innlogging, i motsetning til MCP-søket
// dette erstattet (matflyt-planen, 6. sep 2026).
export async function sokOdaProdukterAction(
  sok: unknown,
): Promise<
  { ok: true; produkter: OdaProduktTreff[] } | { ok: false; melding: string }
> {
  if (typeof sok !== "string" || sok.trim().length < 2) {
    return { ok: false, melding: "Skriv minst to tegn." };
  }
  if (sok.length > MAKS_SOK) {
    return { ok: false, melding: "Søket er for langt." };
  }

  try {
    const produkter = await sokOdaProdukter(sok);
    return {
      ok: true,
      produkter: produkter.map((produkt) => ({
        id: produkt.id,
        name: produkt.name,
        brand: produkt.brand,
        description: produkt.nameExtra ?? "",
        price: produkt.grossPrice,
        unitPrice: produkt.grossUnitPrice,
        unitPriceUnit: produkt.unitPriceUnit,
      })),
    };
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Oda-produktsøk feilet:", feil);
    return { ok: false, melding: "Søket feilet. Prøv igjen." };
  }
}
