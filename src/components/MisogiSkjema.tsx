"use client";

import { useActionState, useEffect } from "react";
import { lagreMisogiAction } from "@/app/maal/actions";
import type { Goal } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { SkjemaFelt } from "./skjema/SkjemaFelt";
import { SkjemaValg } from "./skjema/SkjemaValg";
import { SkjemaTekstFelt } from "./skjema/SkjemaTekstFelt";
import { LagreKnappAnimert } from "./skjema/LagreKnappAnimert";

// Lever i mål-dialogen (MaalUtforsker eier <dialog>-elementet). Slanket
// søsken av MaalSkjema: misogien har år og «hvorfor» i stedet for målverdi
// og fremdrift. Utfall/refleksjon settes i MisogiUtfallSkjema – aldri her.
// År-feltet tilbyr kun LEDIGE år (brukerens valg aug. 2026: ikke la et
// opptatt år velges og feile); unik-indeksen i DB står som vern i dybden.
export function MisogiSkjema({
  standardAar,
  opptatteAar,
  rediger,
  onAvbryt,
  onLagret,
}: {
  standardAar: number;
  opptatteAar: number[];
  rediger?: Goal;
  onAvbryt: () => void;
  onLagret: () => void;
}) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    lagreMisogiAction,
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

  // Valgbare år: neste år og ti bakover (etterregistrering + planlegging),
  // minus år som alt har en misogi – radens eget år er valgbart ved
  // redigering, og tas med selv om det ligger utenfor vinduet.
  const opptatte = new Set(opptatteAar);
  if (rediger?.misogiYear != null) {
    opptatte.delete(rediger.misogiYear);
  }
  const kandidater: number[] = [];
  for (let aar = standardAar + 1; aar >= standardAar - 10; aar--) {
    kandidater.push(aar);
  }
  if (rediger?.misogiYear != null && !kandidater.includes(rediger.misogiYear)) {
    kandidater.push(rediger.misogiYear);
  }
  const valgbareAar = kandidater.filter((aar) => !opptatte.has(aar));
  const standardValg =
    verdier?.aar ??
    String(
      rediger?.misogiYear ??
        (valgbareAar.includes(standardAar)
          ? standardAar
          : (valgbareAar[0] ?? standardAar)),
    );

  return (
    <form action={handling} className="p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          {rediger ? "Rediger misogi" : "Årets misogi"}
        </h2>
        <button
          type="button"
          onClick={onAvbryt}
          className="text-xs text-ink-3 transition-colors hover:text-ink"
        >
          Avbryt
        </button>
      </div>
      {rediger && <input type="hidden" name="id" value={rediger.id} />}
      <div className="flex flex-col gap-3">
        <p className="text-xs leading-relaxed text-ink-3">
          Én utfordring som definerer året. To regler: ~50 % sjanse for å
          mislykkes – og du kan ikke dø.
        </p>
        <SkjemaFelt
          etikett="Tittel"
          name="tittel"
          type="text"
          autoComplete="off"
          placeholder="Svøm over Drøbaksundet"
          defaultValue={verdier?.tittel ?? rediger?.title}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <SkjemaValg
            etikett="År"
            name="aar"
            defaultValue={standardValg}
            required
          >
            {valgbareAar.map((aar) => (
              <option key={aar} value={aar}>
                {aar}
              </option>
            ))}
          </SkjemaValg>
          <SkjemaFelt
            etikett="Forsøksdag (valgfritt)"
            name="planlagtDato"
            type="date"
            defaultValue={verdier?.planlagtDato ?? rediger?.dueOn ?? undefined}
          />
        </div>
        <SkjemaTekstFelt
          etikett="Hvorfor? (halve poenget)"
          name="motivasjon"
          rows={3}
          placeholder="Hvorfor definerer denne året?"
          defaultValue={verdier?.motivasjon ?? rediger?.motivation ?? undefined}
        />
        <div>
          <LagreKnappAnimert
            resultat={resultat}
            idleTekst={rediger ? "Oppdater" : "Sett misogi"}
            lagretTekst={rediger ? "Oppdatert" : "Satt"}
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
