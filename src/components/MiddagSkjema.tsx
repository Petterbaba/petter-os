"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { lagreMiddagAction, sokMatvarerAction } from "@/app/mat/actions";
import type { Dinner } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { SkjemaFelt } from "./skjema/SkjemaFelt";
import { SkjemaTekstFelt } from "./skjema/SkjemaTekstFelt";
import { LagreKnappAnimert } from "./skjema/LagreKnappAnimert";

type ValgtMatvare = { id: string; name: string; kcalPer100g: number };

type IngrediensRad = {
  nokkel: number; // stabil React-key uavhengig av posisjon
  label: string;
  mengde: string; // norsk tall-tekst i gram; tom = «etter smak»
  matvare: ValgtMatvare | null;
};

function tilRader(middag: Dinner | undefined): IngrediensRad[] {
  if (!middag) {
    return [];
  }
  return middag.ingredients.map((rad, indeks) => ({
    nokkel: indeks,
    label: rad.label,
    mengde:
      rad.amountGrams === null ? "" : String(rad.amountGrams).replace(".", ","),
    matvare:
      rad.foodItem === null
        ? null
        : {
            id: rad.foodItem.id,
            name: rad.foodItem.name,
            kcalPer100g: rad.foodItem.kcalPer100g,
          },
  }));
}

// Lever i dialogen (MatUtforsker eier <dialog>-elementet). Redigering
// forhåndsutfyller feltene via skjult id-felt (journal-mønsteret); skjult
// odaid-felt bevarer kildekoblingen for importerte retter. Ingrediens-
// radene er klient-state (dynamisk liste) og sendes som JSON i ett skjult
// felt; actionen validerer dem like strengt som vanlige felt.
export function MiddagSkjema({
  rediger,
  onAvbryt,
  onLagret,
}: {
  rediger?: Dinner;
  onAvbryt: () => void;
  onLagret: () => void;
}) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    lagreMiddagAction,
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

  const [rader, setRader] = useState<IngrediensRad[]>(() => tilRader(rediger));
  const [nesteNokkel, setNesteNokkel] = useState(rader.length);

  // React 19 kjører native form.reset() etter HVER fullført action – også
  // feilede. Ingrediensradene er kontrollerte og re-rendres ikke ved uendret
  // state, så DOM-en ville blitt stående nullstilt; remount via ny key
  // tvinger de kontrollerte verdiene tilbake. Radene nullstilles i tillegg
  // etter vellykket lagring. («Adjust state during render»-mønsteret.)
  const [forrigeResultat, setForrigeResultat] = useState(resultat);
  const [nullstillNokkel, setNullstillNokkel] = useState(0);
  if (resultat !== forrigeResultat) {
    setForrigeResultat(resultat);
    setNullstillNokkel((nokkel) => nokkel + 1);
    if (resultat?.ok) {
      setRader(tilRader(rediger));
    }
  }

  function oppdaterRad(nokkel: number, endring: Partial<IngrediensRad>) {
    setRader((gamle) =>
      gamle.map((rad) => (rad.nokkel === nokkel ? { ...rad, ...endring } : rad)),
    );
  }

  function leggTilRad() {
    setRader((gamle) => [
      ...gamle,
      { nokkel: nesteNokkel, label: "", mengde: "", matvare: null },
    ]);
    setNesteNokkel((nokkel) => nokkel + 1);
  }

  function fjernRad(nokkel: number) {
    setRader((gamle) => gamle.filter((rad) => rad.nokkel !== nokkel));
  }

  const serialiserteRader = JSON.stringify(
    rader.map((rad) => ({
      label: rad.label.trim(),
      mengde: rad.mengde.trim(),
      foodItemId: rad.matvare?.id ?? null,
    })),
  );

  return (
    <form action={handling} className="p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          {rediger ? "Rediger middag" : "Ny middag"}
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
      {rediger?.odaRecipeId && (
        <input type="hidden" name="odaid" value={rediger.odaRecipeId} />
      )}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <SkjemaFelt
            etikett="Tittel"
            name="tittel"
            type="text"
            autoComplete="off"
            placeholder="Kremet laksepasta"
            defaultValue={verdier?.tittel ?? rediger?.title}
            required
          />
          <SkjemaFelt
            etikett="Porsjoner"
            name="porsjoner"
            type="number"
            min={1}
            max={50}
            step={1}
            inputMode="numeric"
            defaultValue={
              verdier?.porsjoner ??
              (rediger ? String(rediger.servings) : "2")
            }
            required
          />
        </div>

        <fieldset key={`rader-${nullstillNokkel}`}>
          <legend className="mb-1 block text-xs text-ink-3">
            Ingredienser (gram; tom mengde = «etter smak»)
          </legend>
          <input type="hidden" name="ingredienser" value={serialiserteRader} />
          <div className="flex flex-col gap-2">
            {rader.map((rad) => (
              <div
                key={rad.nokkel}
                className="rounded-lg border border-edge p-2"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Laksefilet"
                    aria-label="Ingrediensnavn"
                    value={rad.label}
                    onChange={(hendelse) =>
                      oppdaterRad(rad.nokkel, { label: hendelse.target.value })
                    }
                    className="w-full min-w-0 flex-1 rounded-lg border border-edge bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="400"
                    aria-label="Mengde i gram"
                    value={rad.mengde}
                    onChange={(hendelse) =>
                      oppdaterRad(rad.nokkel, { mengde: hendelse.target.value })
                    }
                    className="w-20 shrink-0 rounded-lg border border-edge bg-bg px-3 py-2 text-right text-sm tabular-nums text-ink outline-none transition-colors focus:border-accent"
                  />
                  <span className="shrink-0 text-xs text-ink-3">g</span>
                  <button
                    type="button"
                    onClick={() => fjernRad(rad.nokkel)}
                    aria-label={`Fjern ${rad.label || "ingrediensen"}`}
                    className="shrink-0 rounded-lg border border-edge px-2 py-1.5 text-xs text-ink-3 transition-colors hover:border-accent hover:text-ink"
                  >
                    ✕
                  </button>
                </div>
                <MatvareVelger
                  matvare={rad.matvare}
                  onVelg={(matvare) => oppdaterRad(rad.nokkel, { matvare })}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={leggTilRad}
            className="mt-2 rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
          >
            + Legg til ingrediens
          </button>
        </fieldset>

        <SkjemaTekstFelt
          etikett="Fremgangsmåte (valgfritt)"
          name="fremgangsmate"
          rows={4}
          defaultValue={verdier?.fremgangsmate ?? rediger?.instructions ?? undefined}
        />
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

// Kobler ingrediensen til en matvare fra Matvaretabellen – koblingen (og
// grammengden) er det som gjør at raden teller i næringsberegningen.
// Søket kaller server-funksjonen imperativt (React 19); Enter i søkefeltet
// søker i stedet for å sende hele skjemaet.
function MatvareVelger({
  matvare,
  onVelg,
}: {
  matvare: ValgtMatvare | null;
  onVelg: (matvare: ValgtMatvare | null) => void;
}) {
  const [sok, setSok] = useState("");
  const [treff, setTreff] = useState<ValgtMatvare[] | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [soker, startSok] = useTransition();

  function utforSok() {
    startSok(async () => {
      const svar = await sokMatvarerAction(sok);
      if (svar.ok) {
        setTreff(svar.matvarer);
        setMelding(svar.matvarer.length === 0 ? "Ingen treff." : null);
      } else {
        setTreff(null);
        setMelding(svar.melding);
      }
    });
  }

  if (matvare !== null) {
    return (
      <p className="mt-1.5 flex items-baseline gap-2 text-xs">
        <span className="min-w-0 break-words text-ink-2">
          → {matvare.name}
          <span className="text-ink-3">
            {" "}
            · {Math.round(matvare.kcalPer100g)} kcal/100 g
          </span>
        </span>
        <button
          type="button"
          onClick={() => onVelg(null)}
          className="shrink-0 text-ink-3 underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
        >
          fjern kobling
        </button>
      </p>
    );
  }

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          autoComplete="off"
          placeholder="Koble til matvare (søk i Matvaretabellen) …"
          aria-label="Søk i Matvaretabellen"
          value={sok}
          onChange={(hendelse) => setSok(hendelse.target.value)}
          onKeyDown={(hendelse) => {
            if (hendelse.key === "Enter") {
              hendelse.preventDefault();
              utforSok();
            }
          }}
          className="w-full min-w-0 flex-1 rounded-lg border border-edge bg-bg px-3 py-1.5 text-xs text-ink outline-none transition-colors focus:border-accent"
        />
        <button
          type="button"
          onClick={utforSok}
          disabled={soker}
          className="shrink-0 rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent disabled:opacity-50"
        >
          {soker ? "Søker …" : "Søk"}
        </button>
      </div>
      {melding && <p className="mt-1 text-xs text-ink-3">{melding}</p>}
      {treff !== null && treff.length > 0 && (
        <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-edge">
          {treff.map((kandidat) => (
            <li key={kandidat.id} className="border-t border-edge first:border-t-0">
              <button
                type="button"
                onClick={() => onVelg(kandidat)}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-xs text-ink-2 transition-colors hover:bg-bg/60 hover:text-ink"
              >
                <span className="min-w-0 break-words">{kandidat.name}</span>
                <span className="shrink-0 tabular-nums text-ink-3">
                  {Math.round(kandidat.kcalPer100g)} kcal
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
