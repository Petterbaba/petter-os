"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  fjernPlanlagtMiddag,
  flyttPlanlagtMiddag,
  getMiddager,
  getUkesplan,
  planleggMiddager,
  planleggMiddag,
} from "@/lib/data/mat";
import { erGyldigIsoDato, erUuid } from "@/lib/validering";
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

// Ukesplanen og Oda-kurven på /mat. Oppskriftseditoren (lagring og
// ingrediens-søkene) bor i src/app/kokebok/actions.ts – én editor for
// begge sidene.

export async function planleggMiddagAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const dato = String(formData.get("dato") ?? "").trim();
  const middag = String(formData.get("middag") ?? "").trim();

  if (!erGyldigIsoDato(dato)) {
    return { ok: false, melding: "Ugyldig dato." };
  }
  if (middag !== "" && !erUuid(middag)) {
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

// Dra-og-slipp i ukesplanen. Kalles imperativt fra UkesplanKort (React 19
// server function, samme mønster som søke-actionene i kokebok/actions.ts)
// – ingen skjema å binde til. Klienten sender kun datoene; hvilken middag som ligger hvor leses
// på serveren (flyttPlanlagtMiddag: ledig dag = flytt, opptatt = bytt).
export async function flyttMiddagAction(
  fra: unknown,
  til: unknown,
): Promise<ActionResultat> {
  if (
    typeof fra !== "string" ||
    typeof til !== "string" ||
    !erGyldigIsoDato(fra) ||
    !erGyldigIsoDato(til) ||
    fra === til
  ) {
    return { ok: false, melding: "Kunne ikke flytte middagen. Prøv igjen." };
  }

  let flyttet: boolean;
  try {
    flyttet = await flyttPlanlagtMiddag(fra, til);
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Flytting i ukesplanen feilet:", feil);
    return { ok: false, melding: "Kunne ikke flytte middagen. Prøv igjen." };
  }

  revalidatePath("/mat");
  return flyttet
    ? { ok: true }
    : { ok: false, melding: "Dagen har ingen middag lenger – planen er oppdatert." };
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

// --- Oda-tilkoblingen -----------------------------------------------------

// Leser tilkoblingen og fornyer tokenet i god tid før det utløper –
// brukes av kurv-knappen (produktsøket går mot den lokale katalogen).
// null = ikke koblet til; kaster OdaIkkeAutorisert når fornyelse er
// umulig (fanges av kallstedet).
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
