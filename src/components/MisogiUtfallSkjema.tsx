"use client";

import { useActionState, useEffect, useState } from "react";
import { settMisogiUtfallAction } from "@/app/maal/actions";
import type { Goal } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { SkjemaTekstFelt } from "./skjema/SkjemaTekstFelt";
import { LagreKnappAnimert } from "./skjema/LagreKnappAnimert";

const UTFALL_VALG = [
  { verdi: "fullført", etikett: "Fullført" },
  { verdi: "forsøkt", etikett: "Forsøkt" },
] as const;

// Lever i mål-dialogen (MaalUtforsker eier <dialog>-elementet). Egen flyt
// for utfallet så vanlig redigering aldri overskriver det: misogien hedrer
// forsøket, og «forsøkt» er en fullverdig sluttilstand – ikke en fiasko.
export function MisogiUtfallSkjema({
  maal,
  onAvbryt,
  onLagret,
}: {
  maal: Goal;
  onAvbryt: () => void;
  onLagret: () => void;
}) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    settMisogiUtfallAction,
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

  // Kontrollerte radioer (samme mønster som reise-vurderingen); remount
  // via ny key etter hver action holder DOM-en i synk med staten.
  const [valgtUtfall, setValgtUtfall] = useState(
    maal.outcome !== null && maal.outcome !== "planlagt" ? maal.outcome : "",
  );
  const [forrigeResultat, setForrigeResultat] = useState(resultat);
  const [nullstillNokkel, setNullstillNokkel] = useState(0);
  if (resultat !== forrigeResultat) {
    setForrigeResultat(resultat);
    setNullstillNokkel((nokkel) => nokkel + 1);
  }

  return (
    <form action={handling} className="p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Hvordan gikk det?
        </h2>
        <button
          type="button"
          onClick={onAvbryt}
          className="text-xs text-ink-3 transition-colors hover:text-ink"
        >
          Avbryt
        </button>
      </div>
      <input type="hidden" name="id" value={maal.id} />
      <div className="flex flex-col gap-3">
        <p className="break-words text-sm font-medium text-ink">{maal.title}</p>
        <div
          key={`utfall-${nullstillNokkel}`}
          role="radiogroup"
          aria-label="Utfall"
          className="flex gap-2"
        >
          {UTFALL_VALG.map((valg) => (
            <label key={valg.verdi} className="cursor-pointer">
              <input
                type="radio"
                name="utfall"
                value={valg.verdi}
                checked={valgtUtfall === valg.verdi}
                onChange={() => setValgtUtfall(valg.verdi)}
                required
                className="peer sr-only"
              />
              <span className="flex h-[38px] items-center justify-center rounded-lg border border-edge px-4 text-sm text-ink-2 transition-colors hover:border-accent peer-checked:border-accent peer-checked:text-ink peer-focus-visible:ring-1 peer-focus-visible:ring-accent">
                {valg.etikett}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-3">
          Et ærlig forsøk teller like mye – misogien er forsøket, ikke
          resultatet.
        </p>
        <SkjemaTekstFelt
          etikett="Refleksjon (valgfritt)"
          name="refleksjon"
          rows={4}
          placeholder="Hva satt igjen etterpå?"
          defaultValue={verdier?.refleksjon ?? maal.reflection ?? undefined}
        />
        <div>
          <LagreKnappAnimert
            resultat={resultat}
            idleTekst="Lagre utfall"
            lagretTekst="Lagret"
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
