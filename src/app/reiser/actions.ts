"use server";

import { revalidatePath } from "next/cache";
import { lagreReise, oppdaterReise, slettReise } from "@/lib/data/trips";
import { lesVerdenskart } from "@/lib/kart";
import { erGyldigIsoDato } from "@/lib/validering";
import { REISE_KATEGORIER, type ReiseKategori } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";

// DB håndhever det generiske (ikke-tom tittel, gyldig landkode-format,
// ended >= started, rating 1–5); presise grenser og meldinger bor her.
// Fremtidige datoer er bevisst tillatt – planlagte turer er også turer.
const MAKS_TITTEL = 200;
const MAKS_BY = 100;
const MAKS_HVEM = 200;
const MAKS_NOTAT = 20_000;
const MAKS_KOSTNAD = 10_000_000;
const UUID_MONSTER =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function lagreReiseAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  // Skjult id-felt = redigering; tomt = ny reise.
  const id = String(formData.get("id") ?? "").trim();
  const tittel = String(formData.get("tittel") ?? "").trim();
  const land = String(formData.get("land") ?? "").trim();
  const by = String(formData.get("by") ?? "").trim();
  const fra = String(formData.get("fra") ?? "").trim();
  const til = String(formData.get("til") ?? "").trim();
  const kostnadInput = String(formData.get("kostnad") ?? "").trim();
  const vurderingRaa = String(formData.get("vurdering") ?? "").trim();
  const hvem = String(formData.get("hvem") ?? "").trim();
  const kategoriRaa = String(formData.get("kategori") ?? "").trim();
  const notater = String(formData.get("notater") ?? "").trim();
  // Ved feil sendes input tilbake så skjemaet kan bevare det
  // (React 19 nullstiller ukontrollerte felt når actionen fullfører).
  const verdier = {
    tittel,
    by,
    fra,
    til,
    kostnad: kostnadInput,
    hvem,
    kategori: kategoriRaa,
    notater,
  };

  if (id !== "" && !UUID_MONSTER.test(id)) {
    // Manipulert skjult felt – ikke noe brukeren kan rette selv.
    return { ok: false, melding: "Kunne ikke lagre reisen. Prøv igjen.", verdier };
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
  if (!lesVerdenskart().landkoder.includes(land)) {
    return { ok: false, melding: "Velg et land fra listen.", verdier };
  }
  if (by.length > MAKS_BY) {
    return { ok: false, melding: `Byen kan være maks ${MAKS_BY} tegn.`, verdier };
  }
  if (!erGyldigIsoDato(fra) || !erGyldigIsoDato(til)) {
    return { ok: false, melding: "Ugyldig dato.", verdier };
  }
  if (til < fra) {
    return {
      ok: false,
      melding: "Hjemreisen kan ikke være før avreisen.",
      verdier,
    };
  }

  let kostnad: number | null = null;
  if (kostnadInput !== "") {
    // Norsk komma godtas ("12 500,50" → 12500.5).
    const tall = Number(kostnadInput.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(tall) || tall < 0) {
      return { ok: false, melding: "Kostnaden må være et tall.", verdier };
    }
    if (tall > MAKS_KOSTNAD) {
      return { ok: false, melding: "Kostnaden er urimelig høy.", verdier };
    }
    kostnad = Math.round(tall * 100) / 100;
  }

  let vurdering: number | null = null;
  if (vurderingRaa !== "") {
    const tall = Number(vurderingRaa);
    if (!Number.isInteger(tall) || tall < 1 || tall > 5) {
      return {
        ok: false,
        melding: "Vurderingen må være et helt tall fra 1 til 5.",
        verdier,
      };
    }
    vurdering = tall;
  }

  if (hvem.length > MAKS_HVEM) {
    return {
      ok: false,
      melding: `«Hvem var med» kan være maks ${MAKS_HVEM} tegn.`,
      verdier,
    };
  }

  let kategori: ReiseKategori | null = null;
  if (kategoriRaa !== "") {
    if (!(REISE_KATEGORIER as readonly string[]).includes(kategoriRaa)) {
      return { ok: false, melding: "Ugyldig kategori.", verdier };
    }
    kategori = kategoriRaa as ReiseKategori;
  }

  if (notater.length > MAKS_NOTAT) {
    return {
      ok: false,
      melding: `Notatene kan være maks ${MAKS_NOTAT} tegn.`,
      verdier,
    };
  }

  const felter = {
    title: tittel,
    countryCode: land,
    city: by === "" ? null : by,
    startedOn: fra,
    endedOn: til,
    costNok: kostnad,
    rating: vurdering,
    companions: hvem === "" ? null : hvem,
    category: kategori,
    notes: notater === "" ? null : notater,
  };

  try {
    if (id === "") {
      await lagreReise(felter);
    } else {
      await oppdaterReise(id, felter);
    }
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Lagring av reise feilet:", feil);
    return { ok: false, melding: "Kunne ikke lagre reisen. Prøv igjen.", verdier };
  }

  revalidatePath("/reiser");
  return {
    ok: true,
    melding: id === "" ? "Reise lagret." : "Reise oppdatert.",
  };
}

export async function slettReiseAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const id = String(formData.get("id") ?? "").trim();
  if (!UUID_MONSTER.test(id)) {
    return { ok: false, melding: "Kunne ikke slette reisen. Prøv igjen." };
  }

  try {
    await slettReise(id);
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Sletting av reise feilet:", feil);
    return { ok: false, melding: "Kunne ikke slette reisen. Prøv igjen." };
  }

  revalidatePath("/reiser");
  return { ok: true, melding: "Reise slettet." };
}
