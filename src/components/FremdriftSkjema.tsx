"use client";

import { useActionState, useEffect } from "react";
import { loggFremdriftAction } from "@/app/maal/actions";
import type { Goal } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { SkjemaFelt } from "./skjema/SkjemaFelt";
import { LagreKnappAnimert } from "./skjema/LagreKnappAnimert";

// Lever i mål-dialogen (MaalUtforsker eier <dialog>-elementet). Logger ett
// fremdriftsinnslag på et manuelt mål («1 bok», «20 000 kr») – innslagene
// summeres av datalaget. Kun manuelle mål: automatiske avvises i actionen.
export function FremdriftSkjema({
  maal,
  standardDato,
  onAvbryt,
  onLagret,
}: {
  maal: Goal;
  standardDato: string;
  onAvbryt: () => void;
  onLagret: () => void;
}) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    loggFremdriftAction,
    undefined,
  );
  const verdier = resultat && !resultat.ok ? resultat.verdier : undefined;

  // Lukk dialogen etter vellykket lagring – med nok forsinkelse til at
  // lagre-animasjonen og kvitteringen rekker å vises.
  useEffect(() => {
    if (!resultat?.ok) return;
    const timer = setTimeout(onLagret, 1600);
    return () => clearTimeout(timer);
  }, [resultat, onLagret]);

  return (
    <form action={handling} className="p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Logg fremdrift
        </h2>
        <button
          type="button"
          onClick={onAvbryt}
          className="text-xs text-ink-3 transition-colors hover:text-ink"
        >
          Avbryt
        </button>
      </div>
      <input type="hidden" name="maalId" value={maal.id} />
      <div className="flex flex-col gap-3">
        <p className="break-words text-sm font-medium text-ink">{maal.title}</p>
        <div className="grid grid-cols-2 gap-3">
          <SkjemaFelt
            etikett="Dato"
            name="dato"
            type="date"
            max={standardDato}
            defaultValue={verdier?.dato ?? standardDato}
            required
          />
          <SkjemaFelt
            etikett={maal.unit ? `Verdi (${maal.unit})` : "Verdi"}
            name="verdi"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="1"
            defaultValue={verdier?.verdi}
            required
          />
        </div>
        <SkjemaFelt
          etikett="Notat (valgfritt)"
          name="notat"
          type="text"
          autoComplete="off"
          defaultValue={verdier?.notat}
        />
        <div>
          <LagreKnappAnimert
            resultat={resultat}
            idleTekst="Logg"
            lagretTekst="Logget"
          />
        </div>
      </div>
      {resultat && (
        <p
          role={resultat.ok ? "status" : "alert"}
          className="mt-3 text-sm text-ink-2"
        >
          {resultat.melding}
        </p>
      )}
    </form>
  );
}
