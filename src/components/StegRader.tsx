"use client";

import type { DinnerStep } from "@/lib/types";

// Steg-editoren i oppskriftsskjemaet: én tekstboks per steg i rekkefølge,
// med flytt opp/ned og fjern. Samme mønster som ingrediensradene: rad-
// STATE eies av skjemaet (remount-nøkkelen der dekker React 19s
// form-reset), og radene sendes som JSON i ett skjult felt som
// server-actionen validerer (parseSteg). Ingen dra-og-slipp – opp/ned er
// nok og tastaturvennlig.

export type StegRad = {
  nokkel: number; // stabil React-key uavhengig av posisjon
  tekst: string;
};

export function tilStegRader(steg: DinnerStep[] | undefined): StegRad[] {
  return (steg ?? []).map((etSteg, indeks) => ({
    nokkel: indeks,
    tekst: etSteg.body,
  }));
}

// Formen server-actionen validerer: tekstene i rekkefølge.
export function serialiserSteg(rader: StegRad[]): string {
  return JSON.stringify(rader.map((rad) => rad.tekst.trim()));
}

const KNAPP =
  "rounded-lg border border-edge px-2 py-1 text-xs text-ink-3 transition-colors hover:border-accent hover:text-ink aria-disabled:opacity-40 aria-disabled:hover:border-edge aria-disabled:hover:text-ink-3";

export function StegRader({
  rader,
  sistLagtTil,
  onOppdater,
  onLeggTil,
  onFjern,
  onFlytt,
}: {
  rader: StegRad[];
  sistLagtTil: number | null;
  onOppdater: (nokkel: number, tekst: string) => void;
  onLeggTil: () => void;
  onFjern: (nokkel: number) => void;
  onFlytt: (nokkel: number, retning: -1 | 1) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-xs text-ink-3">
        Fremgangsmåte (ett steg per rad)
      </legend>
      <input type="hidden" name="steg" value={serialiserSteg(rader)} />
      {rader.length > 0 && (
        <ol className="flex flex-col gap-2">
          {rader.map((rad, indeks) => {
            const nr = indeks + 1;
            const forste = indeks === 0;
            const siste = indeks === rader.length - 1;
            return (
              <li key={rad.nokkel} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 pt-2 text-right text-sm tabular-nums text-ink-3"
                >
                  {nr}.
                </span>
                <textarea
                  rows={2}
                  aria-label={`Steg ${nr}`}
                  placeholder="Beskriv steget …"
                  value={rad.tekst}
                  autoFocus={rad.nokkel === sistLagtTil}
                  onChange={(hendelse) =>
                    onOppdater(rad.nokkel, hendelse.target.value)
                  }
                  className="min-w-0 flex-1 resize-y rounded-lg border border-edge bg-bg px-3 py-2 text-sm leading-snug text-ink outline-none transition-colors focus:border-accent"
                />
                {/* aria-disabled, ikke disabled: flyttes et steg helt til
                    topps med tastaturet, ville disabled kastet fokus til
                    body (LagreKnappAnimert-regelen). */}
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    aria-label={`Flytt steg ${nr} opp`}
                    aria-disabled={forste}
                    onClick={() => {
                      if (!forste) onFlytt(rad.nokkel, -1);
                    }}
                    className={KNAPP}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Flytt steg ${nr} ned`}
                    aria-disabled={siste}
                    onClick={() => {
                      if (!siste) onFlytt(rad.nokkel, 1);
                    }}
                    className={KNAPP}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Fjern steg ${nr}`}
                    onClick={() => onFjern(rad.nokkel)}
                    className={KNAPP}
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <button
        type="button"
        onClick={onLeggTil}
        className="mt-2 rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
      >
        + Legg til steg
      </button>
    </fieldset>
  );
}
