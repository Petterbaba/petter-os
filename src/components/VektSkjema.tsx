"use client";

import { useActionState } from "react";
import { lagreVektAction } from "@/app/metrikker/actions";
import type { ActionResultat } from "@/lib/actions";
import { SkjemaFelt } from "./skjema/SkjemaFelt";
import { LagreKnapp } from "./skjema/LagreKnapp";

export function VektSkjema({ standardDato }: { standardDato: string }) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    lagreVektAction,
    undefined,
  );
  const verdier = resultat && !resultat.ok ? resultat.verdier : undefined;

  return (
    <form
      action={handling}
      className="mb-4 rounded-xl border border-edge bg-card p-4 sm:p-5"
    >
      <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-ink-3">
        Ny veiing
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-40">
          <SkjemaFelt
            etikett="Dato"
            name="dato"
            type="date"
            defaultValue={verdier?.dato ?? standardDato}
            max={standardDato}
            required
          />
        </div>
        <div className="sm:w-32">
          <SkjemaFelt
            etikett="Vekt (kg)"
            name="vekt"
            type="text"
            inputMode="decimal"
            placeholder="82,4"
            autoComplete="off"
            defaultValue={verdier?.vekt}
            required
          />
        </div>
        <LagreKnapp>Lagre</LagreKnapp>
      </div>
      {resultat && (
        <p role={resultat.ok ? "status" : "alert"} className="mt-3 text-sm text-ink-2">
          {resultat.melding}
        </p>
      )}
    </form>
  );
}
