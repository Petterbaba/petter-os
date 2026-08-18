"use server";

import { revalidatePath } from "next/cache";
import { lagreVekt } from "@/lib/data/metrics";
import { iDagOslo } from "@/lib/dato";
import { erGyldigIsoDato } from "@/lib/validering";
import type { ActionResultat } from "@/lib/actions";

const MIN_KG = 30;
const MAKS_KG = 250;

export async function lagreVektAction(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const datoRaa = String(formData.get("dato") ?? "").trim();
  const vektInput = String(formData.get("vekt") ?? "").trim();
  // Norsk komma godtas ("82,4" → 82.4).
  const vektRaa = vektInput.replace(",", ".");
  // Ved feil sendes input tilbake så skjemaet kan bevare det
  // (React 19 nullstiller feltene når actionen fullfører).
  const verdier = { dato: datoRaa, vekt: vektInput };

  // Rund-tur-sjekken bor i den delte erGyldigIsoDato (lib/validering).
  if (!erGyldigIsoDato(datoRaa)) {
    return { ok: false, melding: "Ugyldig dato.", verdier };
  }
  if (datoRaa > iDagOslo()) {
    return { ok: false, melding: "Datoen kan ikke være frem i tid.", verdier };
  }

  const vekt = Number(vektRaa);
  if (!Number.isFinite(vekt) || vektRaa === "") {
    return { ok: false, melding: "Vekten må være et tall.", verdier };
  }
  if (vekt < MIN_KG || vekt > MAKS_KG) {
    return {
      ok: false,
      melding: `Vekten må være mellom ${MIN_KG} og ${MAKS_KG} kg.`,
      verdier,
    };
  }

  try {
    await lagreVekt(datoRaa, Math.round(vekt * 100) / 100);
  } catch (feil) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Lagring av vekt feilet:", feil);
    return {
      ok: false,
      melding: "Kunne ikke lagre målingen. Prøv igjen.",
      verdier,
    };
  }

  revalidatePath("/metrikker");
  revalidatePath("/dashbord");
  return { ok: true, melding: "Måling lagret." };
}
