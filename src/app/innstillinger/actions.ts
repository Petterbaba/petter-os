"use server";

import { opprettServerKlient } from "@/lib/supabase/server";
import type { ActionResultat } from "@/lib/actions";

const MIN_LENGDE = 8;

export async function byttPassord(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const naavaerende = String(formData.get("naavaerende") ?? "");
  const nytt = String(formData.get("nytt") ?? "");
  const gjenta = String(formData.get("gjenta") ?? "");

  // Passord sendes aldri tilbake i `verdier` – feltene tømmes ved feil.
  if (!naavaerende || !nytt || !gjenta) {
    return { ok: false, melding: "Fyll inn alle feltene." };
  }
  if (nytt.length < MIN_LENGDE) {
    return {
      ok: false,
      melding: `Nytt passord må ha minst ${MIN_LENGDE} tegn.`,
    };
  }
  if (nytt !== gjenta) {
    return { ok: false, melding: "De nye passordene er ikke like." };
  }
  if (nytt === naavaerende) {
    return { ok: false, melding: "Nytt passord må være et annet enn dagens." };
  }

  const supabase = await opprettServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false, melding: "Du er ikke innlogget." };
  }

  // updateUser() krever ikke dagens passord, så vi verifiserer det selv
  // før byttet – ellers kunne hvem som helst ved en åpen maskin bytte det.
  const { error: verifiseringsFeil } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: naavaerende,
  });
  if (verifiseringsFeil) {
    return { ok: false, melding: "Dagens passord er feil." };
  }

  const { error } = await supabase.auth.updateUser({ password: nytt });
  if (error) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Passordbytte feilet:", error.message);
    return { ok: false, melding: "Kunne ikke bytte passordet. Prøv igjen." };
  }

  return { ok: true, melding: "Passordet er byttet." };
}
