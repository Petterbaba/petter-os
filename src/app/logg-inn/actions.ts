"use server";

import { redirect } from "next/navigation";
import { opprettServerKlient } from "@/lib/supabase/server";
import type { ActionResultat } from "@/lib/actions";

export async function loggInn(
  _forrige: ActionResultat | undefined,
  formData: FormData,
): Promise<ActionResultat> {
  const epost = String(formData.get("epost") ?? "").trim();
  const passord = String(formData.get("passord") ?? "");

  if (!epost || !passord) {
    return {
      ok: false,
      melding: "Fyll inn både e-post og passord.",
      verdier: { epost },
    };
  }

  const supabase = await opprettServerKlient();
  const { error } = await supabase.auth.signInWithPassword({
    email: epost,
    password: passord,
  });

  if (error) {
    // Generisk melding i UI; detaljer kun i serverloggen.
    console.error("Innlogging feilet:", error.message);
    return {
      ok: false,
      melding: "Feil e-post eller passord.",
      verdier: { epost },
    };
  }

  redirect("/");
}
