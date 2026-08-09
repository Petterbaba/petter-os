"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { lagreJournalAction } from "@/app/journal/actions";
import type { ActionResultat } from "@/lib/actions";
import { SkjemaFelt } from "./skjema/SkjemaFelt";
import { SkjemaTekstFelt } from "./skjema/SkjemaTekstFelt";
import { LagreKnappAnimert } from "./skjema/LagreKnappAnimert";

type Rediger = { id: string; dato: string; tittel: string; tekst: string };

const VURDERINGER = [1, 2, 3, 4, 5];

// Ett skjema for hele dagen: dato + dagsvurdering øverst, tittel og
// tekst under. Serveren avgjør om det er en innførsel, en vurdering
// eller begge som lagres (derfor ingen native required på tekstfeltene).
// I redigeringsmodus (rediger satt) forhåndsutfylles feltene og et skjult
// id-felt får actionen til å oppdatere i stedet for å opprette; siden gir
// komponenten ny key per modus, så defaultValue-ene tas i bruk ved bytte.
//
// Vurderingsradioene er KONTROLLERTE og bundet til datofeltet: den
// forhåndsvalgte vurderingen tilhører fokusdagen, så bytter brukeren dato
// nullstilles valget – ellers ville fokusdagens vurdering blitt skrevet
// stille over den nye datoens eksisterende vurdering ved lagring. Klikk
// på valgt verdi angrer valget (radioer kan ellers ikke velges bort).
export function JournalSkjema({
  standardDato,
  standardVurdering,
  rediger,
}: {
  standardDato: string;
  standardVurdering: number | null;
  rediger?: Rediger;
}) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    lagreJournalAction,
    undefined,
  );
  const verdier = resultat && !resultat.ok ? resultat.verdier : undefined;

  const fokusDato = rediger?.dato ?? standardDato;
  const forhaandsvalg =
    standardVurdering === null ? "" : String(standardVurdering);
  const [valgtVurdering, setValgtVurdering] = useState(forhaandsvalg);

  // Etter vellykket lagring nullstiller React 19 de ukontrollerte
  // feltene til default – synk vurderingen til fokusdagens lagrede verdi
  // (oppdatert via revalidatePath) så radioene ikke henger igjen.
  useEffect(() => {
    if (resultat?.ok) {
      setValgtVurdering(forhaandsvalg);
    }
  }, [resultat, forhaandsvalg]);

  return (
    <form
      action={handling}
      className="mb-4 rounded-xl border border-edge bg-card p-4 sm:p-5"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          {rediger ? "Rediger innførsel" : "Ny innførsel"}
        </h2>
        {rediger && (
          <Link
            href="/journal"
            className="text-xs text-ink-3 transition-colors hover:text-ink"
          >
            Avbryt
          </Link>
        )}
      </div>
      {rediger && <input type="hidden" name="id" value={rediger.id} />}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <div className="sm:w-40">
            <SkjemaFelt
              etikett="Dato"
              name="dato"
              type="date"
              defaultValue={verdier?.dato ?? rediger?.dato ?? standardDato}
              max={standardDato}
              required
              onChange={(hendelse) =>
                setValgtVurdering(
                  hendelse.target.value === fokusDato ? forhaandsvalg : "",
                )
              }
            />
          </div>
          {/* Vurderingen midtstilles i restbredden til høyre for datofeltet
              (w-max + mx-auto); på mobil stables den venstrestilt som resten. */}
          <div className="sm:flex-1">
            <div className="sm:mx-auto sm:w-max">
              <span
                id="vurdering-etikett"
                className="mb-1 block text-xs text-ink-3"
              >
                Hvordan var dagen?
              </span>
              <div
                role="radiogroup"
                aria-labelledby="vurdering-etikett"
                className="flex gap-2"
              >
                {VURDERINGER.map((verdi) => (
                  <label key={verdi} className="cursor-pointer">
                    <input
                      type="radio"
                      name="vurdering"
                      value={verdi}
                      checked={valgtVurdering === String(verdi)}
                      onChange={() => setValgtVurdering(String(verdi))}
                      onClick={() => {
                        // Klikk (også Space) på allerede valgt verdi angrer.
                        if (valgtVurdering === String(verdi)) {
                          setValgtVurdering("");
                        }
                      }}
                      className="peer sr-only"
                    />
                    <span className="flex h-[38px] w-10 items-center justify-center rounded-lg border border-edge text-sm text-ink-2 transition-colors hover:border-accent peer-checked:border-accent peer-checked:text-ink peer-focus-visible:ring-1 peer-focus-visible:ring-accent">
                      {verdi}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <SkjemaFelt
          etikett="Tittel"
          name="tittel"
          type="text"
          autoComplete="off"
          defaultValue={verdier?.tittel ?? rediger?.tittel}
        />
        <SkjemaTekstFelt
          etikett="Tekst"
          name="tekst"
          rows={5}
          defaultValue={verdier?.tekst ?? rediger?.tekst}
        />
        <div>
          <LagreKnappAnimert
            resultat={resultat}
            idleTekst={rediger ? "Oppdater" : "Lagre"}
            lagretTekst={rediger ? "Oppdatert" : "Lagret"}
          />
        </div>
      </div>
      {resultat && (
        <p role={resultat.ok ? "status" : "alert"} className="mt-3 text-sm text-ink-2">
          {resultat.melding}
        </p>
      )}
    </form>
  );
}
