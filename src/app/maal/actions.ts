"use server";

import { revalidatePath } from "next/cache";
import {
  AaretHarMisogi,
  MaaletHarInnslag,
  UtenforMaalPerioden,
  getMetrikkTyper,
  lagreMaal,
  lagreMisogi,
  loggFremdrift,
  oppdaterMaal,
  oppdaterMisogi,
  settMisogiUtfall,
  slettFremdrift,
  slettMaal,
} from "@/lib/data/goals";
import { iDagOslo } from "@/lib/dato";
import { erGyldigIsoDato, parseNorskTall } from "@/lib/validering";
import {
  MAAL_KILDER,
  MAAL_RETNINGER,
  MISOGI_UTFALL,
  type MaalKilde,
  type MaalRetning,
  type MisogiUtfall,
} from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";

// DB håndhever det generiske (ikke-tom tittel, målverdi > 0, maks én
// kilde, én misogi per år); presise grenser og meldinger bor her.
// Fremtidige datoer er bevisst tillatt – mål peker per definisjon fremover.
const MAKS_TITTEL = 200;
const MAKS_MOTIVASJON = 2000;
const MAKS_REFLEKSJON = 20_000;
const MAKS_NOTAT = 500;
const MAKS_ENHET = 20;
const MAKS_MAALVERDI = 1_000_000_000;
const MIN_AAR = 2000;
const MAKS_AAR = 2100;
const MODUSER = ["manuell", "metrikk", "teller"] as const;
const UUID_MONSTER =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function revaliderMaal() {
  revalidatePath("/maal");
  revalidatePath("/dashbord");
}

export async function lagreMaalAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  // Skjult id-felt = redigering; tomt = nytt mål.
  const id = String(formData.get("id") ?? "").trim();
  const tittel = String(formData.get("tittel") ?? "").trim();
  const motivasjon = String(formData.get("motivasjon") ?? "").trim();
  const modus = String(formData.get("modus") ?? "").trim();
  const maalverdiInput = String(formData.get("maalverdi") ?? "").trim();
  const enhet = String(formData.get("enhet") ?? "").trim();
  const metrikk = String(formData.get("metrikk") ?? "").trim();
  const retningRaa = String(formData.get("retning") ?? "").trim();
  const kildeRaa = String(formData.get("kilde") ?? "").trim();
  const fra = String(formData.get("fra") ?? "").trim();
  const frist = String(formData.get("frist") ?? "").trim();
  // Ved feil sendes input tilbake så skjemaet kan bevare det
  // (React 19 nullstiller ukontrollerte felt når actionen fullfører).
  const verdier = {
    tittel,
    motivasjon,
    modus,
    maalverdi: maalverdiInput,
    enhet,
    metrikk,
    retning: retningRaa,
    kilde: kildeRaa,
    fra,
    frist,
  };
  const feilMelding = "Kunne ikke lagre målet. Prøv igjen.";

  if (id !== "" && !UUID_MONSTER.test(id)) {
    // Manipulert skjult felt – ikke noe brukeren kan rette selv.
    return { ok: false, melding: feilMelding, verdier };
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
  if (motivasjon.length > MAKS_MOTIVASJON) {
    return {
      ok: false,
      melding: `Motivasjonen kan være maks ${MAKS_MOTIVASJON} tegn.`,
      verdier,
    };
  }
  if (!(MODUSER as readonly string[]).includes(modus)) {
    return { ok: false, melding: "Velg en sporingsmodus.", verdier };
  }
  if (!erGyldigIsoDato(fra)) {
    return { ok: false, melding: "Ugyldig startdato.", verdier };
  }
  if (frist !== "" && !erGyldigIsoDato(frist)) {
    return { ok: false, melding: "Ugyldig frist.", verdier };
  }
  if (frist !== "" && frist < fra) {
    return {
      ok: false,
      melding: "Fristen kan ikke være før startdatoen.",
      verdier,
    };
  }

  // Avrundes FØR grensesjekkene: ellers passerer «0,004» > 0-sjekken,
  // rundes til 0 og feiler først på DB-checken med generisk melding.
  const maalverdiRaa = parseNorskTall(maalverdiInput);
  const maalverdi =
    maalverdiRaa === null ? null : Math.round(maalverdiRaa * 100) / 100;
  if (maalverdi === null || maalverdi <= 0) {
    return {
      ok: false,
      melding: "Målverdien må være et tall større enn 0.",
      verdier,
    };
  }
  if (maalverdi > MAKS_MAALVERDI) {
    return { ok: false, melding: "Målverdien er urimelig høy.", verdier };
  }

  let metrikkNokkel: string | null = null;
  let retning: MaalRetning | null = null;
  let kilde: MaalKilde | null = null;

  if (modus === "manuell") {
    if (enhet.length > MAKS_ENHET) {
      return {
        ok: false,
        melding: `Enheten kan være maks ${MAKS_ENHET} tegn.`,
        verdier,
      };
    }
  } else if (modus === "metrikk") {
    const typer = await getMetrikkTyper();
    if (!typer.some((type) => type.key === metrikk)) {
      return { ok: false, melding: "Velg en metrikk fra listen.", verdier };
    }
    if (!(MAAL_RETNINGER as readonly string[]).includes(retningRaa)) {
      return { ok: false, melding: "Velg en retning for målet.", verdier };
    }
    metrikkNokkel = metrikk;
    retning = retningRaa as MaalRetning;
  } else {
    if (!(MAAL_KILDER as readonly string[]).includes(kildeRaa)) {
      return { ok: false, melding: "Velg en kilde for tellingen.", verdier };
    }
    if (!Number.isInteger(maalverdi)) {
      return {
        ok: false,
        melding: "Antallet må være et helt tall.",
        verdier,
      };
    }
    kilde = kildeRaa as MaalKilde;
  }

  const felter = {
    title: tittel,
    motivation: motivasjon === "" ? null : motivasjon,
    startsOn: fra,
    dueOn: frist === "" ? null : frist,
    targetValue: maalverdi,
    unit: modus === "manuell" && enhet !== "" ? enhet : null,
    metricKey: metrikkNokkel,
    direction: retning,
    countSource: kilde,
  };

  try {
    if (id === "") {
      await lagreMaal(felter);
    } else {
      await oppdaterMaal(id, felter);
    }
  } catch (feil) {
    if (feil instanceof MaaletHarInnslag) {
      return {
        ok: false,
        melding:
          "Målet har loggede innslag – slett dem før du bytter til automatisk sporing.",
        verdier,
      };
    }
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Lagring av mål feilet:", feil);
    return { ok: false, melding: feilMelding, verdier };
  }

  revaliderMaal();
  return { ok: true, melding: id === "" ? "Mål lagret." : "Mål oppdatert." };
}

export async function lagreMisogiAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const id = String(formData.get("id") ?? "").trim();
  const tittel = String(formData.get("tittel") ?? "").trim();
  const motivasjon = String(formData.get("motivasjon") ?? "").trim();
  const aarRaa = String(formData.get("aar") ?? "").trim();
  const planlagtDato = String(formData.get("planlagtDato") ?? "").trim();
  const verdier = { tittel, motivasjon, aar: aarRaa, planlagtDato };
  const feilMelding = "Kunne ikke lagre misogien. Prøv igjen.";

  if (id !== "" && !UUID_MONSTER.test(id)) {
    // Manipulert skjult felt – ikke noe brukeren kan rette selv.
    return { ok: false, melding: feilMelding, verdier };
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
  if (motivasjon.length > MAKS_MOTIVASJON) {
    return {
      ok: false,
      melding: `Motivasjonen kan være maks ${MAKS_MOTIVASJON} tegn.`,
      verdier,
    };
  }

  const aar = Number(aarRaa);
  if (!Number.isInteger(aar) || aar < MIN_AAR || aar > MAKS_AAR) {
    return {
      ok: false,
      melding: `Året må være et heltall mellom ${MIN_AAR} og ${MAKS_AAR}.`,
      verdier,
    };
  }
  if (planlagtDato !== "") {
    if (!erGyldigIsoDato(planlagtDato)) {
      return { ok: false, melding: "Ugyldig planlagt dato.", verdier };
    }
    if (planlagtDato.slice(0, 4) !== String(aar)) {
      return {
        ok: false,
        melding: "Den planlagte datoen må ligge i misogi-året.",
        verdier,
      };
    }
  }

  const felter = {
    title: tittel,
    motivation: motivasjon === "" ? null : motivasjon,
    misogiYear: aar,
    dueOn: planlagtDato === "" ? null : planlagtDato,
  };

  try {
    if (id === "") {
      await lagreMisogi(felter);
    } else {
      await oppdaterMisogi(id, felter);
    }
  } catch (feil) {
    if (feil instanceof AaretHarMisogi) {
      return {
        ok: false,
        melding: `Du har allerede en misogi for ${aar} – rediger den i stedet.`,
        verdier,
      };
    }
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Lagring av misogi feilet:", feil);
    return { ok: false, melding: feilMelding, verdier };
  }

  revaliderMaal();
  return {
    ok: true,
    melding: id === "" ? "Misogi satt." : "Misogi oppdatert.",
  };
}

export async function settMisogiUtfallAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const id = String(formData.get("id") ?? "").trim();
  const utfallRaa = String(formData.get("utfall") ?? "").trim();
  const refleksjon = String(formData.get("refleksjon") ?? "").trim();
  const verdier = { utfall: utfallRaa, refleksjon };
  const feilMelding = "Kunne ikke lagre utfallet. Prøv igjen.";

  if (!UUID_MONSTER.test(id)) {
    // Manipulert skjult felt – ikke noe brukeren kan rette selv.
    return { ok: false, melding: feilMelding, verdier };
  }
  if (!(MISOGI_UTFALL as readonly string[]).includes(utfallRaa)) {
    return { ok: false, melding: "Velg hvordan det gikk.", verdier };
  }
  if (refleksjon.length > MAKS_REFLEKSJON) {
    return {
      ok: false,
      melding: `Refleksjonen kan være maks ${MAKS_REFLEKSJON} tegn.`,
      verdier,
    };
  }

  try {
    await settMisogiUtfall(
      id,
      utfallRaa as MisogiUtfall,
      refleksjon === "" ? null : refleksjon,
    );
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Lagring av misogi-utfall feilet:", feil);
    return { ok: false, melding: feilMelding, verdier };
  }

  revaliderMaal();
  return { ok: true, melding: "Utfall lagret." };
}

export async function loggFremdriftAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const maalId = String(formData.get("maalId") ?? "").trim();
  const dato = String(formData.get("dato") ?? "").trim();
  const verdiInput = String(formData.get("verdi") ?? "").trim();
  const notat = String(formData.get("notat") ?? "").trim();
  const verdier = { dato, verdi: verdiInput, notat };
  const feilMelding = "Kunne ikke logge fremdriften. Prøv igjen.";

  if (!UUID_MONSTER.test(maalId)) {
    // Manipulert skjult felt – ikke noe brukeren kan rette selv.
    return { ok: false, melding: feilMelding, verdier };
  }
  if (!erGyldigIsoDato(dato)) {
    return { ok: false, melding: "Ugyldig dato.", verdier };
  }
  if (dato > iDagOslo()) {
    // Fremdrift logges ikke frem i tid (vekt-regelen) – i motsetning til
    // selve målet, som gjerne peker fremover.
    return { ok: false, melding: "Datoen kan ikke være frem i tid.", verdier };
  }

  // Avrundes FØR grensesjekkene (samme grunn som i lagreMaalAction).
  const verdiRaa = parseNorskTall(verdiInput);
  const verdi = verdiRaa === null ? null : Math.round(verdiRaa * 100) / 100;
  if (verdi === null || verdi <= 0) {
    return {
      ok: false,
      melding: "Verdien må være et tall større enn 0.",
      verdier,
    };
  }
  if (verdi > MAKS_MAALVERDI) {
    return { ok: false, melding: "Verdien er urimelig høy.", verdier };
  }
  if (notat.length > MAKS_NOTAT) {
    return {
      ok: false,
      melding: `Notatet kan være maks ${MAKS_NOTAT} tegn.`,
      verdier,
    };
  }

  try {
    await loggFremdrift({
      goalId: maalId,
      loggedOn: dato,
      value: verdi,
      note: notat === "" ? null : notat,
    });
  } catch (feil) {
    if (feil instanceof UtenforMaalPerioden) {
      return {
        ok: false,
        melding: "Datoen må ligge i målets periode.",
        verdier,
      };
    }
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Logging av fremdrift feilet:", feil);
    return { ok: false, melding: feilMelding, verdier };
  }

  revaliderMaal();
  return { ok: true, melding: "Fremdrift logget." };
}

export async function slettMaalAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const id = String(formData.get("id") ?? "").trim();
  if (!UUID_MONSTER.test(id)) {
    return { ok: false, melding: "Kunne ikke slette målet. Prøv igjen." };
  }

  try {
    await slettMaal(id);
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Sletting av mål feilet:", feil);
    return { ok: false, melding: "Kunne ikke slette målet. Prøv igjen." };
  }

  revaliderMaal();
  return { ok: true, melding: "Mål slettet." };
}

export async function slettFremdriftAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const id = String(formData.get("id") ?? "").trim();
  if (!UUID_MONSTER.test(id)) {
    return { ok: false, melding: "Kunne ikke slette innslaget. Prøv igjen." };
  }

  try {
    await slettFremdrift(id);
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Sletting av fremdriftsinnslag feilet:", feil);
    return { ok: false, melding: "Kunne ikke slette innslaget. Prøv igjen." };
  }

  revaliderMaal();
  return { ok: true, melding: "Innslag slettet." };
}
