"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { lagreOppskriftAction } from "@/app/kokebok/actions";
import type { Dinner } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { VANSKELIGHETER, vanskelighetTekst } from "@/lib/matlaging";
import { SkjemaFelt } from "./skjema/SkjemaFelt";
import { SkjemaTekstFelt } from "./skjema/SkjemaTekstFelt";
import { SkjemaValg } from "./skjema/SkjemaValg";
import { LagreKnappAnimert } from "./skjema/LagreKnappAnimert";
import {
  IngrediensRader,
  nyIngrediensRad,
  tilIngrediensRader,
  type IngrediensRad,
} from "./IngrediensRader";
import { StegRader, tilStegRader, type StegRad } from "./StegRader";

// Kokebokens oppskriftseditor – den ENE editoren (/kokebok/ny og
// /kokebok/[id]/rediger; «Ny middag»/«Rediger» på /mat lenker hit).
// Redigering går via skjult id-felt (journal-mønsteret); skjult odaid-felt
// bevarer kildekoblingen for importerte retter. Ingrediens- og stegradene
// er klient-state og sendes som JSON i hvert sitt skjulte felt; actionen
// validerer dem like strengt som vanlige felt. Vellykket lagring sender
// til oppskriften (redirect i actionen) – navigasjonen er kvitteringen.
export function OppskriftSkjema({ rediger }: { rediger?: Dinner }) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    lagreOppskriftAction,
    undefined,
  );
  const verdier = resultat && !resultat.ok ? resultat.verdier : undefined;

  const [ingredienser, setIngredienser] = useState<IngrediensRad[]>(() =>
    tilIngrediensRader(rediger),
  );
  const [nesteIngrediens, setNesteIngrediens] = useState(
    () => rediger?.ingredients.length ?? 0,
  );
  // Ny oppskrift starter med ett tomt steg å skrive i (tomme steg
  // droppes ved lagring, så det koster ingenting å la det stå).
  const [steg, setSteg] = useState<StegRad[]>(() =>
    rediger ? tilStegRader(rediger.steps) : [{ nokkel: 0, tekst: "" }],
  );
  const [nesteSteg, setNesteSteg] = useState(() =>
    rediger ? rediger.steps.length : 1,
  );
  const [sistLagtTilSteg, setSistLagtTilSteg] = useState<number | null>(null);

  // React 19 kjører native form.reset() etter HVER fullført action – også
  // feilede. Radene er kontrollerte og re-rendres ikke ved uendret state,
  // så DOM-en ville blitt stående nullstilt; remount via ny key tvinger de
  // kontrollerte verdiene tilbake («adjust state during render»). Suksess
  // ender i redirect, så radene nullstilles aldri her.
  const [forrigeResultat, setForrigeResultat] = useState(resultat);
  const [nullstillNokkel, setNullstillNokkel] = useState(0);
  if (resultat !== forrigeResultat) {
    setForrigeResultat(resultat);
    setNullstillNokkel((nokkel) => nokkel + 1);
  }

  function oppdaterIngrediens(nokkel: number, endring: Partial<IngrediensRad>) {
    setIngredienser((gamle) =>
      gamle.map((rad) => (rad.nokkel === nokkel ? { ...rad, ...endring } : rad)),
    );
  }

  function leggTilIngrediens() {
    setIngredienser((gamle) => [...gamle, nyIngrediensRad(nesteIngrediens)]);
    setNesteIngrediens((nokkel) => nokkel + 1);
  }

  function fjernIngrediens(nokkel: number) {
    setIngredienser((gamle) => gamle.filter((rad) => rad.nokkel !== nokkel));
  }

  function oppdaterSteg(nokkel: number, tekst: string) {
    setSteg((gamle) =>
      gamle.map((rad) => (rad.nokkel === nokkel ? { ...rad, tekst } : rad)),
    );
  }

  function leggTilSteg() {
    setSteg((gamle) => [...gamle, { nokkel: nesteSteg, tekst: "" }]);
    setSistLagtTilSteg(nesteSteg);
    setNesteSteg((nokkel) => nokkel + 1);
  }

  function fjernSteg(nokkel: number) {
    setSteg((gamle) => gamle.filter((rad) => rad.nokkel !== nokkel));
  }

  // Bytter plass med naboen. key = nokkel, så React flytter DOM-noden og
  // tastaturfokus følger steget.
  function flyttSteg(nokkel: number, retning: -1 | 1) {
    setSteg((gamle) => {
      const fra = gamle.findIndex((rad) => rad.nokkel === nokkel);
      const til = fra + retning;
      if (fra === -1 || til < 0 || til >= gamle.length) {
        return gamle;
      }
      const nye = [...gamle];
      [nye[fra], nye[til]] = [nye[til], nye[fra]];
      return nye;
    });
  }

  return (
    <form
      action={handling}
      className="rounded-xl border border-edge bg-card p-4 sm:p-5"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          {rediger ? "Rediger oppskrift" : "Ny oppskrift"}
        </h1>
        <Link
          href={rediger ? `/kokebok/${rediger.id}` : "/kokebok"}
          className="text-xs text-ink-3 transition-colors hover:text-ink"
        >
          Avbryt
        </Link>
      </div>
      {rediger && <input type="hidden" name="id" value={rediger.id} />}
      {rediger?.odaRecipeId && (
        <input type="hidden" name="odaid" value={rediger.odaRecipeId} />
      )}

      <div className="flex flex-col gap-4">
        <SkjemaFelt
          etikett="Tittel"
          name="tittel"
          type="text"
          autoComplete="off"
          placeholder="Kremet laksepasta"
          defaultValue={verdier?.tittel ?? rediger?.title}
          required
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SkjemaFelt
            etikett="Porsjoner"
            name="porsjoner"
            type="number"
            min={1}
            max={50}
            step={1}
            inputMode="numeric"
            defaultValue={
              verdier?.porsjoner ?? (rediger ? String(rediger.servings) : "2")
            }
            required
          />
          <SkjemaFelt
            etikett="Tid i minutter (valgfritt)"
            name="tid"
            type="number"
            min={1}
            max={10080}
            step={1}
            inputMode="numeric"
            placeholder="25"
            defaultValue={
              verdier?.tid ??
              (rediger === undefined || rediger.cookMinutes === null
                ? ""
                : String(rediger.cookMinutes))
            }
          />
          <div className="col-span-2 sm:col-span-1">
            <SkjemaValg
              etikett="Vanskelighet (valgfritt)"
              name="vanskelighet"
              defaultValue={verdier?.vanskelighet ?? rediger?.difficulty ?? ""}
            >
              <option value="">–</option>
              {VANSKELIGHETER.map((vanskelighet) => (
                <option key={vanskelighet} value={vanskelighet}>
                  {vanskelighetTekst(vanskelighet)}
                </option>
              ))}
            </SkjemaValg>
          </div>
        </div>

        <div key={`rader-${nullstillNokkel}`} className="flex flex-col gap-4">
          <IngrediensRader
            rader={ingredienser}
            onOppdater={oppdaterIngrediens}
            onLeggTil={leggTilIngrediens}
            onFjern={fjernIngrediens}
          />
          <StegRader
            rader={steg}
            sistLagtTil={sistLagtTilSteg}
            onOppdater={oppdaterSteg}
            onLeggTil={leggTilSteg}
            onFjern={fjernSteg}
            onFlytt={flyttSteg}
          />
        </div>

        <SkjemaFelt
          etikett="Kilde-lenke (valgfritt)"
          name="kilde"
          type="url"
          autoComplete="off"
          placeholder="https://…"
          defaultValue={verdier?.kilde ?? rediger?.sourceUrl ?? undefined}
        />
        <SkjemaTekstFelt
          etikett="Notater (valgfritt)"
          name="notater"
          rows={2}
          defaultValue={verdier?.notater ?? rediger?.notes ?? undefined}
        />

        <div className="flex flex-wrap items-center gap-3">
          <LagreKnappAnimert
            resultat={resultat}
            idleTekst={rediger ? "Oppdater" : "Lagre"}
            lagretTekst={rediger ? "Oppdatert" : "Lagret"}
          />
          {resultat && !resultat.ok && (
            <p role="alert" className="text-sm text-ink-2">
              {resultat.melding}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
