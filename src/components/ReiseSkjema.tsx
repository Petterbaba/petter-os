"use client";

import { useActionState, useEffect, useState } from "react";
import { lagreReiseAction } from "@/app/reiser/actions";
import { REISE_KATEGORIER, type Trip } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { SkjemaFelt } from "./skjema/SkjemaFelt";
import { SkjemaValg } from "./skjema/SkjemaValg";
import { SkjemaTekstFelt } from "./skjema/SkjemaTekstFelt";
import { LagreKnappAnimert } from "./skjema/LagreKnappAnimert";

const VURDERINGER = [1, 2, 3, 4, 5];

// Lever i registrerings-dialogen (ReiseUtforsker eier <dialog>-elementet).
// I redigeringsmodus (rediger satt) forhåndsutfylles feltene og et skjult
// id-felt får actionen til å oppdatere i stedet for å opprette; eieren gir
// komponenten ny key per mål, så useState-initialverdiene tas i bruk.
// Land-feltet er KONTROLLERT og delt med kartet: klikk på kartet
// forhåndsvelger landet her, og valg her markerer kartet.
// Vurderingsradioene er kontrollerte så et valg kan angres (klikk på valgt
// verdi) og nullstilles etter vellykket lagring.
export function ReiseSkjema({
  land,
  valgtLand,
  onLandChange,
  standardDato,
  rediger,
  onAvbryt,
  onLagret,
}: {
  land: { kode: string; navn: string }[];
  valgtLand: string | null;
  onLandChange: (kode: string | null) => void;
  standardDato: string;
  rediger?: Trip;
  onAvbryt: () => void;
  onLagret: () => void;
}) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    lagreReiseAction,
    undefined,
  );
  const verdier = resultat && !resultat.ok ? resultat.verdier : undefined;

  // Lukk dialogen etter vellykket lagring – med nok forsinkelse til at
  // lagre-animasjonen og kvitteringen rekker å vises. close() på en
  // allerede lukket dialog er no-op, så re-kjøringer er ufarlige.
  useEffect(() => {
    if (!resultat?.ok) return;
    const timer = setTimeout(onLagret, 1600);
    return () => clearTimeout(timer);
  }, [resultat, onLagret]);

  const [valgtVurdering, setValgtVurdering] = useState(
    rediger?.rating != null ? String(rediger.rating) : "",
  );

  // React 19 kjører native form.reset() etter HVER fullført action – også
  // feilede. Kontrollerte felt (land-selecten, vurderingsradioene) med
  // uendret state re-rendres ikke, så DOM-en ville blitt stående nullstilt
  // mens staten sier noe annet. Remount via ny key tvinger de kontrollerte
  // verdiene tilbake inn i DOM-en. Vurderingen nullstilles i tillegg etter
  // vellykket lagring. («Adjust state during render»-mønsteret.)
  const [forrigeResultat, setForrigeResultat] = useState(resultat);
  const [nullstillNokkel, setNullstillNokkel] = useState(0);
  if (resultat !== forrigeResultat) {
    setForrigeResultat(resultat);
    setNullstillNokkel((nokkel) => nokkel + 1);
    if (resultat?.ok) {
      setValgtVurdering("");
    }
  }

  return (
    <form action={handling} className="p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          {rediger ? "Rediger reise" : "Ny reise"}
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
        <SkjemaFelt
          etikett="Tittel"
          name="tittel"
          type="text"
          autoComplete="off"
          placeholder="Sommerferie i Italia"
          defaultValue={verdier?.tittel ?? rediger?.title}
          required
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SkjemaValg
            key={`land-${nullstillNokkel}`}
            etikett="Land"
            name="land"
            required
            value={valgtLand ?? ""}
            onChange={(hendelse) =>
              onLandChange(hendelse.target.value === "" ? null : hendelse.target.value)
            }
          >
            <option value="">Velg land … (eller klikk på kartet)</option>
            {land.map((alternativ) => (
              <option key={alternativ.kode} value={alternativ.kode}>
                {alternativ.navn}
              </option>
            ))}
          </SkjemaValg>
          <SkjemaFelt
            etikett="By (valgfritt)"
            name="by"
            type="text"
            autoComplete="off"
            defaultValue={verdier?.by ?? rediger?.city ?? undefined}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SkjemaFelt
            etikett="Fra"
            name="fra"
            type="date"
            defaultValue={verdier?.fra ?? rediger?.startedOn ?? standardDato}
            required
          />
          <SkjemaFelt
            etikett="Til"
            name="til"
            type="date"
            defaultValue={verdier?.til ?? rediger?.endedOn ?? standardDato}
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SkjemaFelt
            etikett="Kostnad (kr, valgfritt)"
            name="kostnad"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="12 500"
            defaultValue={
              verdier?.kostnad ??
              (rediger?.costNok != null
                ? String(rediger.costNok).replace(".", ",")
                : undefined)
            }
          />
          <SkjemaValg
            etikett="Kategori (valgfritt)"
            name="kategori"
            defaultValue={verdier?.kategori ?? rediger?.category ?? ""}
          >
            <option value="">Ingen</option>
            {REISE_KATEGORIER.map((kategori) => (
              <option key={kategori} value={kategori}>
                {kategori.charAt(0).toUpperCase() + kategori.slice(1)}
              </option>
            ))}
          </SkjemaValg>
        </div>
        <SkjemaFelt
          etikett="Hvem var med (valgfritt)"
          name="hvem"
          type="text"
          autoComplete="off"
          defaultValue={verdier?.hvem ?? rediger?.companions ?? undefined}
        />
        <div>
          <span id="reise-vurdering-etikett" className="mb-1 block text-xs text-ink-3">
            Hvordan var turen? (valgfritt)
          </span>
          <div
            key={`vurdering-${nullstillNokkel}`}
            role="radiogroup"
            aria-labelledby="reise-vurdering-etikett"
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
        <SkjemaTekstFelt
          etikett="Notater (valgfritt)"
          name="notater"
          rows={3}
          defaultValue={verdier?.notater ?? rediger?.notes ?? undefined}
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
