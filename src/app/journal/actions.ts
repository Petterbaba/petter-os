"use server";

import { revalidatePath } from "next/cache";
import {
  DagenHarInnforsel,
  lagreDagsvurdering,
  lagreJournalInnforsel,
  oppdaterJournalInnforsel,
} from "@/lib/data/journal";
import { iDagOslo } from "@/lib/dato";
import type { ActionResultat } from "@/lib/actions";

// DB håndhever kun ikke-tomme tekster; presise grenser bor her.
const MAKS_TITTEL = 200;
const MAKS_TEKST = 20_000;
const MIN_VURDERING = 1;
const MAKS_VURDERING = 5;
const UUID_MONSTER =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rund-tur-validering: Date.parse ruller over umulige kalenderdatoer
// (Date.parse("2026-02-31") = 3. mars), så parse og reformater må gi
// tilbake nøyaktig samme streng. Returnerer feilmelding, eller null når
// datoen er gyldig og ikke frem i tid.
function validerDato(dato: string): string | null {
  const parset = new Date(`${dato}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dato) ||
    Number.isNaN(parset.getTime()) ||
    parset.toISOString().slice(0, 10) !== dato
  ) {
    return "Ugyldig dato.";
  }
  if (dato > iDagOslo()) {
    return "Datoen kan ikke være frem i tid.";
  }
  return null;
}

// Ett skjema lagrer hele dagen: innførsel, dagsvurdering eller begge.
// Vurderingen er valgfri; uten id og uten tekstfelt er en vurdering
// alene også en gyldig lagring.
export async function lagreJournalAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  // Skjult id-felt = redigering; tomt = ny innførsel.
  const id = String(formData.get("id") ?? "").trim();
  const datoRaa = String(formData.get("dato") ?? "").trim();
  const tittel = String(formData.get("tittel") ?? "").trim();
  const tekst = String(formData.get("tekst") ?? "").trim();
  const vurderingRaa = String(formData.get("vurdering") ?? "").trim();
  // Ved feil sendes input tilbake så skjemaet kan bevare det
  // (React 19 nullstiller feltene når actionen fullfører).
  const verdier = { dato: datoRaa, tittel, tekst, vurdering: vurderingRaa };

  const datoFeil = validerDato(datoRaa);
  if (datoFeil) {
    return { ok: false, melding: datoFeil, verdier };
  }
  if (id !== "" && !UUID_MONSTER.test(id)) {
    // Manipulert skjult felt – ikke noe brukeren kan rette selv.
    return {
      ok: false,
      melding: "Kunne ikke lagre innførselen. Prøv igjen.",
      verdier,
    };
  }

  let vurdering: number | null = null;
  if (vurderingRaa !== "") {
    const tall = Number(vurderingRaa);
    if (
      !Number.isInteger(tall) ||
      tall < MIN_VURDERING ||
      tall > MAKS_VURDERING
    ) {
      return {
        ok: false,
        melding: `Vurderingen må være et helt tall fra ${MIN_VURDERING} til ${MAKS_VURDERING}.`,
        verdier,
      };
    }
    vurdering = tall;
  }

  const harTekstfelt = tittel !== "" || tekst !== "";
  if (!harTekstfelt && vurdering === null) {
    // Vurdering alene finnes bare i ny-modus – ikke foreslå det når
    // brukeren redigerer en eksisterende innførsel.
    return {
      ok: false,
      melding:
        id === ""
          ? "Skriv en innførsel, eller sett i det minste en dagsvurdering."
          : "Innførselen trenger både tittel og tekst.",
      verdier,
    };
  }
  // Kun vurdering gjelder bare nye lagringer – i redigeringsmodus skal
  // tomme felt aldri tolkes som «hopp over innførselen».
  const kunVurdering = id === "" && !harTekstfelt;

  if (!kunVurdering) {
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
    if (tekst === "") {
      return { ok: false, melding: "Teksten kan ikke være tom.", verdier };
    }
    if (tekst.length > MAKS_TEKST) {
      return {
        ok: false,
        melding: `Teksten kan være maks ${MAKS_TEKST} tegn.`,
        verdier,
      };
    }

    try {
      if (id === "") {
        await lagreJournalInnforsel(datoRaa, tittel, tekst);
      } else {
        await oppdaterJournalInnforsel(id, datoRaa, tittel, tekst);
      }
    } catch (feil) {
      if (feil instanceof DagenHarInnforsel) {
        // «Rediger» bytter skjemaet til den eksisterende innførselen og
        // forkaster utkastet – meldingen må advare om det, ikke lokke dit.
        return {
          ok: false,
          melding:
            "Denne dagen har allerede en innførsel. Velg en annen dato – eller kopier teksten din først og åpne dagen med «Rediger», så erstattes skjemaet med den eksisterende innførselen.",
          verdier,
        };
      }
      // Generisk melding i UI; detaljer kun i serverloggen.
      console.error("Lagring av journalinnførsel feilet:", feil);
      return {
        ok: false,
        melding: "Kunne ikke lagre innførselen. Prøv igjen.",
        verdier,
      };
    }
  }

  if (vurdering !== null) {
    try {
      await lagreDagsvurdering(datoRaa, vurdering);
    } catch (feil) {
      console.error("Lagring av dagsvurdering feilet:", feil);
      if (kunVurdering) {
        return {
          ok: false,
          melding: "Kunne ikke lagre vurderingen. Prøv igjen.",
          verdier,
        };
      }
      // Innførselen er allerede lagret – revalider så den vises, men
      // meld tydelig fra om at vurderingen mangler. I ny-modus tømmes
      // tekstfeltene i verdier: ellers ville neste «Lagre» forsøkt å
      // sette inn innførselen på nytt og truffet unik-nøkkelen (23505)
      // i stedet for å lagre vurderingen.
      revalidatePath("/journal");
      revalidatePath("/dashbord");
      return {
        ok: false,
        melding:
          id === ""
            ? "Innførselen ble lagret, men vurderingen feilet. Trykk Lagre igjen for å lagre vurderingen alene."
            : "Innførselen ble oppdatert, men vurderingen feilet. Trykk Oppdater igjen.",
        verdier: id === "" ? { ...verdier, tittel: "", tekst: "" } : verdier,
      };
    }
  }

  revalidatePath("/journal");
  revalidatePath("/dashbord");
  if (kunVurdering) {
    return { ok: true, melding: "Vurdering lagret." };
  }
  const grunnmelding = id === "" ? "Innførsel lagret." : "Innførsel oppdatert.";
  return {
    ok: true,
    melding:
      vurdering !== null
        ? `${grunnmelding.replace(".", "")} med dagsvurdering.`
        : grunnmelding,
  };
}
