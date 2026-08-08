"use client";

import { useActionState } from "react";
import { loggInn } from "@/app/logg-inn/actions";
import type { ActionResultat } from "@/lib/actions";
import { SkjemaFelt } from "./skjema/SkjemaFelt";
import { LagreKnapp } from "./skjema/LagreKnapp";

export function LoggInnSkjema() {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    loggInn,
    undefined,
  );

  const verdier = resultat && !resultat.ok ? resultat.verdier : undefined;

  return (
    <form action={handling} className="w-full max-w-xs space-y-4">
      <SkjemaFelt
        etikett="E-post"
        name="epost"
        type="email"
        autoComplete="email"
        defaultValue={verdier?.epost}
        required
      />
      <SkjemaFelt
        etikett="Passord"
        name="passord"
        type="password"
        autoComplete="current-password"
        required
      />
      {resultat && !resultat.ok && (
        <p role="alert" className="text-sm text-ink-2">
          {resultat.melding}
        </p>
      )}
      <LagreKnapp>Logg inn</LagreKnapp>
    </form>
  );
}
