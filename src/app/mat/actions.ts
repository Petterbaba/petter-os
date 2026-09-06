"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  fjernPlanlagtMiddag,
  getMiddager,
  getUkesplan,
  planleggMiddager,
  lagreMiddag,
  MiddagAlleredeImportert,
  oppdaterMiddag,
  planleggMiddag,
  sokMatvarer,
  sokOdaProdukter,
  type NyIngrediens,
} from "@/lib/data/mat";
import { erGyldigIsoDato, parseNorskTall } from "@/lib/validering";
import { erEnhet } from "@/lib/enheter";
import { mandagFor, skiftDager } from "@/lib/dato";
import { lagUkesmeny } from "@/lib/ukesmeny";
import {
  byggOdaAutorisasjonsUrl,
  fornyOdaToken,
  lagPkce,
  lagState,
  registrerOdaKlient,
} from "@/lib/oda/oauth";
import { kallOdaVerktoy, OdaIkkeAutorisert } from "@/lib/oda/mcp";
import {
  lagreOdaFlyt,
  lagreOdaTilkobling,
  lesOdaTilkobling,
  OdaKonfigMangler,
  slettOdaTilkobling,
} from "@/lib/oda/tilkobling";
import type { ActionResultat } from "@/lib/actions";

// DB håndhever det generiske (ikke-tom tittel, porsjoner > 0, mengde > 0);
// presise grenser og meldinger bor her (reise-mønsteret).
const MAKS_TITTEL = 200;
const MAKS_TEKST = 20_000;
const MAKS_KILDE = 500;
const MAKS_ODA_ID = 50;
const MAKS_PORSJONER = 50;
const MAKS_INGREDIENSER = 100;
const MAKS_INGREDIENS_NAVN = 200;
const MAKS_MENGDE = 100_000;
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
      return { ok: false, melding: "Kunne ikke lagre middagen. Prøv igjen." };
    }

    let mengde: number | null = null;
    if (mengdeRaa !== "") {
      const tall = parseNorskTall(mengdeRaa);
      if (tall === null || tall <= 0) {
        return {
          ok: false,
          melding: `Mengden for «${label}» må være et tall over 0 – eller stå tom for «etter smak».`,
        };
      }
      if (tall > MAKS_MENGDE) {
        return { ok: false, melding: `Mengden for «${label}» er urimelig stor.` };
      }
      mengde = Math.round(tall * 10) / 10;
    }

    if (foodItemId !== null && (typeof foodItemId !== "string" || !UUID_MONSTER.test(foodItemId))) {
      return { ok: false, melding: "Kunne ikke lagre middagen. Prøv igjen." };
    }
    // Oda-produkt-id-er er heltall hos kilden; lagres som tekst
    // (oda_recipe_id-presedensen).
    if (
      odaProduktId !== null &&
      (typeof odaProduktId !== "string" || !/^\d{1,20}$/.test(odaProduktId))
    ) {
      return { ok: false, melding: "Kunne ikke lagre middagen. Prøv igjen." };
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

// «Lag ukesmeny»: fyller ledige dager (modus «fyll») eller bytter hele
// uken (modus «erstatt») med retter fra katalogen. Utvalgsreglene bor i
// src/lib/ukesmeny.ts; her hentes bare grunnlaget (katalog, ukens plan og
// de siste fire ukene for «nylig brukt») og resultatet lagres i ett kall.
export async function lagUkesmenyAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const ukeRaa = String(formData.get("mandag") ?? "").trim();
  const modus = String(formData.get("modus") ?? "").trim();

  if (!erGyldigIsoDato(ukeRaa)) {
    return { ok: false, melding: "Ugyldig uke." };
  }
  if (modus !== "fyll" && modus !== "erstatt") {
    return { ok: false, melding: "Kunne ikke lage ukesmeny. Prøv igjen." };
  }
  const mandag = mandagFor(ukeRaa);
  const sondag = skiftDager(mandag, 6);

  let antall: number;
  try {
    const [middager, ukensPlaner, nyligePlaner] = await Promise.all([
      getMiddager(),
      getUkesplan(mandag, sondag),
      getUkesplan(skiftDager(mandag, -28), skiftDager(mandag, -1)),
    ]);
    if (middager.length === 0) {
      return {
        ok: false,
        melding: "Ingen middager i katalogen ennå – legg inn noen først.",
      };
    }

    const middagPerId = new Map(middager.map((middag) => [middag.id, middag]));
    // En plan mot en arkivert middag regnes som ledig dag.
    const laast = new Map(
      ukensPlaner
        .filter((plan) => middagPerId.has(plan.dinnerId))
        .map((plan) => [plan.plannedOn, middagPerId.get(plan.dinnerId)!]),
    );
    const uke = [];
    for (let i = 0; i < 7; i++) {
      const dato = skiftDager(mandag, i);
      uke.push({
        dato,
        middag: modus === "fyll" ? (laast.get(dato) ?? null) : null,
      });
    }
    const brukteIUken = new Set(
      modus === "fyll" ? [...laast.values()].map((middag) => middag.id) : [],
    );
    const kandidater = middager.filter((middag) => !brukteIUken.has(middag.id));

    const sisteBrukt = new Map<string, string>();
    for (const plan of nyligePlaner) {
      const forrige = sisteBrukt.get(plan.dinnerId);
      if (forrige === undefined || forrige < plan.plannedOn) {
        sisteBrukt.set(plan.dinnerId, plan.plannedOn);
      }
    }

    const valg = lagUkesmeny({ uke, kandidater, sisteBrukt });
    if (valg.length === 0) {
      return { ok: false, melding: "Uken er allerede full." };
    }
    await planleggMiddager(valg);
    antall = valg.length;
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Ukesmeny feilet:", feil);
    return { ok: false, melding: "Kunne ikke lage ukesmeny. Prøv igjen." };
  }

  revalidatePath("/mat");
  return {
    ok: true,
    melding:
      antall === 7
        ? "Ukesmeny laget."
        : `Ukesmeny laget – ${antall} ${antall === 1 ? "dag" : "dager"} fylt.`,
  };
}

// Kalles imperativt fra MiddagSkjema (React 19 server function) for
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

// --- Oda-tilkoblingen -----------------------------------------------------

// Leser tilkoblingen og fornyer tokenet i god tid før det utløper – delt
// mellom kurv-knappen og produktsøket. null = ikke koblet til; kaster
// OdaIkkeAutorisert når fornyelse er umulig (fanges av kallstedene).
async function gyldigOdaTilkobling() {
  let tilkobling = await lesOdaTilkobling();
  if (tilkobling === null) {
    return null;
  }
  if (tilkobling.expiresAt < Date.now() + 60_000) {
    if (tilkobling.refreshToken === null) {
      throw new OdaIkkeAutorisert();
    }
    const nytt = await fornyOdaToken({
      clientId: tilkobling.clientId,
      refreshToken: tilkobling.refreshToken,
    });
    tilkobling = {
      clientId: tilkobling.clientId,
      accessToken: nytt.accessToken,
      refreshToken: nytt.refreshToken ?? tilkobling.refreshToken,
      expiresAt: nytt.expiresAt,
    };
    await lagreOdaTilkobling(tilkobling);
  }
  return tilkobling;
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

// Kalles imperativt fra MiddagSkjema (autosøk med debounce): søker i den
// LOKALE katalogen (oda_products, speilet nattlig av synk-scriptet) –
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

// --- Oda-kurven -----------------------------------------------------------

// Callback-URL-en avledes av requesten så lokal utvikling og hosting
// fungerer uten konfig. Oda krever at den er registrert på klienten.
async function odaRedirectUri(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host === null) {
    throw new Error("Fant ikke host-header.");
  }
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}/oda/callback`;
}

// Starter OAuth-flyten: registrerer appen som klient hos Oda, legger
// state + PKCE-verifier i en kortlivet cookie og sender brukeren til
// Odas samtykkeside. redirect() må stå utenfor try (kaster NEXT_REDIRECT).
export async function kobleTilOdaAction(): Promise<void> {
  let autorisasjonsUrl: string;
  try {
    const redirectUri = await odaRedirectUri();
    const clientId = await registrerOdaKlient(redirectUri);
    const { verifier, challenge } = lagPkce();
    const state = lagState();
    await lagreOdaFlyt({ state, verifier, clientId, redirectUri });
    autorisasjonsUrl = await byggOdaAutorisasjonsUrl({
      clientId,
      redirectUri,
      state,
      challenge,
    });
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Oda-tilkobling kunne ikke startes:", feil);
    redirect(feil instanceof OdaKonfigMangler ? "/mat?oda=konfig" : "/mat?oda=feil");
  }
  redirect(autorisasjonsUrl);
}

export async function kobleFraOdaAction(): Promise<void> {
  await slettOdaTilkobling();
  revalidatePath("/mat");
}

// Oppskrifts-idene som allerede ligger i kurven (grupper med groupType
// "recipes" i get_cart-svaret). Tolerant parsing – uventet form gir tomt
// sett, og alt forsøkes da lagt til som før.
function oppskrifterIKurv(kurv: unknown): Set<string> {
  const sett = new Set<string>();
  const grupper =
    kurv !== null && typeof kurv === "object"
      ? (kurv as Record<string, unknown>).groups
      : null;
  if (!Array.isArray(grupper)) {
    return sett;
  }
  for (const gruppe of grupper) {
    if (gruppe === null || typeof gruppe !== "object") {
      continue;
    }
    const post = gruppe as Record<string, unknown>;
    if (post.groupType === "recipes" && typeof post.id === "number") {
      sett.add(String(post.id));
    }
  }
  return sett;
}

function hentKurvUrl(kurv: unknown): string | null {
  return kurv !== null &&
    typeof kurv === "object" &&
    "url" in kurv &&
    typeof kurv.url === "string"
    ? kurv.url
    : null;
}

// Legger ukens Oda-oppskrifter i kurven (MCP manipulate_cart) med
// middagens porsjonstall. Tokenet fornyes ved behov; avvist token sletter
// tilkoblingen så knappen blir «Koble til Oda» igjen.
//
// Odas server 500-er på store operasjonsbatcher (observert med ukens
// 6 retter i ett kall, sep. 2026; enkeltvis gikk fint), så rettene
// legges én og én. Kurven leses FØRST og retter som alt ligger der
// hoppes over – knappen er dermed idempotent: et nytt trykk etter en
// delvis feil legger kun til det som mangler, aldri dobbelt.
export async function leggIOdaKurvAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const ukeRaa = String(formData.get("mandag") ?? "").trim();
  if (!erGyldigIsoDato(ukeRaa)) {
    return { ok: false, melding: "Ugyldig uke." };
  }
  const mandag = mandagFor(ukeRaa);

  try {
    const tilkobling = await gyldigOdaTilkobling();
    if (tilkobling === null) {
      return { ok: false, melding: "Koble til Oda først." };
    }
    const [middager, planer] = await Promise.all([
      getMiddager(),
      getUkesplan(mandag, skiftDager(mandag, 6)),
    ]);
    const middagPerId = new Map(middager.map((middag) => [middag.id, middag]));
    const ukens = planer
      .map((plan) => middagPerId.get(plan.dinnerId))
      .filter((middag) => middag !== undefined);
    const medOda = ukens.filter((middag) => middag.odaRecipeId !== null);
    const utenOda = ukens.filter((middag) => middag.odaRecipeId === null);
    if (medOda.length === 0) {
      return {
        ok: false,
        melding:
          ukens.length === 0
            ? "Ingen middager er planlagt denne uken."
            : "Ingen av ukens middager har Oda-oppskrift.",
      };
    }

    const kurvFor = await kallOdaVerktoy(tilkobling.accessToken, "get_cart", {});
    const iKurven = oppskrifterIKurv(kurvFor);
    const fraFor = medOda.filter((middag) =>
      iKurven.has(String(middag.odaRecipeId)),
    );
    const mangler = medOda.filter(
      (middag) => !iKurven.has(String(middag.odaRecipeId)),
    );

    let sisteKurv: unknown = kurvFor;
    let lagtTil = 0;
    const feilede: string[] = [];
    for (const middag of mangler) {
      try {
        sisteKurv = await kallOdaVerktoy(
          tilkobling.accessToken,
          "manipulate_cart",
          {
            operations: [
              {
                recipeId: Number(middag.odaRecipeId),
                quantity: 1,
                fromRecipePortions: middag.servings,
              },
            ],
          },
        );
        lagtTil += 1;
      } catch (feil) {
        if (feil instanceof OdaIkkeAutorisert) {
          throw feil;
        }
        // Én rett som feiler skal ikke stoppe resten – navnet meldes
        // tilbake, og et nytt trykk prøver kun den på nytt.
        console.error(`Oda-kurv: «${middag.title}» feilet:`, feil);
        feilede.push(middag.title);
      }
    }

    const deler: string[] = [];
    if (lagtTil > 0) {
      deler.push(
        `${lagtTil} ${lagtTil === 1 ? "rett" : "retter"} lagt i Oda-kurven.`,
      );
    } else if (feilede.length === 0) {
      deler.push("Ukens retter ligger allerede i Oda-kurven.");
    }
    if (lagtTil > 0 && fraFor.length > 0) {
      deler.push(
        `${fraFor.length} lå der fra før.`,
      );
    }
    if (feilede.length > 0) {
      deler.push(`Feilet hos Oda: ${feilede.join(", ")} – prøv igjen.`);
    }
    if (utenOda.length > 0) {
      deler.push(
        `Uten Oda-oppskrift: ${utenOda.map((middag) => middag.title).join(", ")}.`,
      );
    }

    const melding = deler.join(" ");
    if (feilede.length > 0) {
      return { ok: false, melding };
    }
    const kurvUrl = hentKurvUrl(sisteKurv);
    return kurvUrl === null
      ? { ok: true, melding }
      : { ok: true, melding, lenke: { href: kurvUrl, tekst: "Åpne kurven hos Oda" } };
  } catch (feil) {
    if (feil instanceof OdaIkkeAutorisert) {
      await slettOdaTilkobling();
      revalidatePath("/mat");
      return { ok: false, melding: "Oda-koblingen er utløpt – koble til på nytt." };
    }
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Oda-kurv feilet:", feil);
    return { ok: false, melding: "Kunne ikke legge i Oda-kurven. Prøv igjen." };
  }
}
