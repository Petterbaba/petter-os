"use client";

import {
  sokMatvarerAction,
  sokOdaProdukterAction,
  type OdaProduktTreff,
} from "@/app/kokebok/actions";
import type { Dinner } from "@/lib/types";
import { ENHETER, type Enhet } from "@/lib/enheter";
import { useAutosok } from "@/lib/useAutosok";

// Ingrediens-editoren i oppskriftsskjemaet: dynamisk radliste med
// Oda-katalogsøk som primærvei og Matvaretabellen-kobling for næring.
// Rad-STATE eies av skjemaet (så remount-nøkkelen der dekker React 19s
// form-reset); denne filen eier radens form, felt og serialisering.

// Verdiene er per 100 g (Matvaretabellen); protein kan mangle i kilden.
type ValgtMatvare = {
  id: string;
  name: string;
  kcalPer100g: number;
  proteinPer100g: number | null;
};

export type IngrediensRad = {
  nokkel: number; // stabil React-key uavhengig av posisjon
  label: string;
  mengde: string; // norsk tall-tekst i valgt enhet; tom = «etter smak»
  enhet: Enhet;
  odaProduktId: string | null; // kildereferanse fra Oda-søket (aldri pris)
  // false = raden er nyopprettet og viser produktsøket som hovedfelt
  // (treffet blir navnet). Eksplisitt state, aldri avledet av teksten –
  // ellers ville raden hoppet til søkemodus midt i skrivingen når
  // navnefeltet tømmes.
  navngitt: boolean;
  matvare: ValgtMatvare | null;
  // Ferdig utfylt Matvaretabellen-søk etter et Oda-valg (næringskoblingen
  // er nice-to-have – forslaget kjøres automatisk, men er lett å ignorere).
  matvareForslag: string | null;
};

export function tilIngrediensRader(middag: Dinner | undefined): IngrediensRad[] {
  if (!middag) {
    return [];
  }
  return middag.ingredients.map((rad, indeks) => ({
    nokkel: indeks,
    label: rad.label,
    mengde: rad.amount === null ? "" : String(rad.amount).replace(".", ","),
    enhet: rad.unit,
    odaProduktId: rad.odaProductId,
    navngitt: true,
    matvareForslag: null,
    matvare:
      rad.foodItem === null
        ? null
        : {
            id: rad.foodItem.id,
            name: rad.foodItem.name,
            kcalPer100g: rad.foodItem.kcalPer100g,
            proteinPer100g: rad.foodItem.proteinPer100g,
          },
  }));
}

export function nyIngrediensRad(nokkel: number): IngrediensRad {
  return {
    nokkel,
    label: "",
    mengde: "",
    enhet: "g",
    odaProduktId: null,
    navngitt: false,
    matvare: null,
    matvareForslag: null,
  };
}

// Formen server-actionen validerer (parseIngredienser).
export function serialiserIngredienser(rader: IngrediensRad[]): string {
  return JSON.stringify(
    rader.map((rad) => ({
      label: rad.label.trim(),
      mengde: rad.mengde.trim(),
      enhet: rad.enhet,
      odaProduktId: rad.odaProduktId,
      foodItemId: rad.matvare?.id ?? null,
    })),
  );
}

// Fieldset med skjult JSON-felt, radene og «+ Legg til ingrediens».
export function IngrediensRader({
  rader,
  onOppdater,
  onLeggTil,
  onFjern,
}: {
  rader: IngrediensRad[];
  onOppdater: (nokkel: number, endring: Partial<IngrediensRad>) => void;
  onLeggTil: () => void;
  onFjern: (nokkel: number) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 block text-xs text-ink-3">
        Ingredienser (tom mengde = «etter smak»)
      </legend>
      <input
        type="hidden"
        name="ingredienser"
        value={serialiserIngredienser(rader)}
      />
      <div className="flex flex-col gap-2">
        {rader.map((rad) => (
          <IngrediensRadFelt
            key={rad.nokkel}
            rad={rad}
            onOppdater={(endring) => onOppdater(rad.nokkel, endring)}
            onFjern={() => onFjern(rad.nokkel)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onLeggTil}
        className="mt-2 rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
      >
        + Legg til ingrediens
      </button>
    </fieldset>
  );
}

// Søkeforslag for næringskoblingen etter et Oda-valg: produktnavnet uten
// merkevareprefiks, redusert til første ord («Norsk Sjømat AS Laksefilet
// uten skinn» → «Laksefilet») – Matvaretabellen-søket er substring-match,
// så hele produktnavn gir sjelden treff. Nice-to-have: bommer forslaget,
// står søkefeltet ferdig utfylt til redigering.
function naeringsForslag(produkt: OdaProduktTreff): string {
  let tekst = produkt.name;
  if (
    produkt.brand !== null &&
    tekst.toLowerCase().startsWith(produkt.brand.toLowerCase())
  ) {
    tekst = tekst.slice(produkt.brand.length);
  }
  const ord = tekst.split(/[\s,]+/).filter((del) => del.length >= 3);
  return ord[0] ?? tekst.trim();
}

// Én ingrediensrad. Nye rader starter i søkemodus: produktsøket i den
// LOKALE Oda-katalogen er hovedfeltet (brukerens valg sep. 2026:
// planleggeren er primærfunksjonen, og man handler hos Oda), og treffet
// blir navnet + lagret kildereferanse – ett felt, ikke navn + kobling
// som dobbeltarbeid. Matvaretabellen-søket kjøres automatisk på et
// forslag fra produktnavnet så næringskoblingen (nice-to-have) bare er
// ett klikk. «Bruk som navn»-utveien dekker det katalogen ikke har
// («salt og pepper»). Navngitte rader viser et fritt redigerbart
// navnefelt (Hardcover-prinsippet: oppskriftens egen ordlyd kan avvike
// fra kildens) med koblingene under.
function IngrediensRadFelt({
  rad,
  onOppdater,
  onFjern,
}: {
  rad: IngrediensRad;
  onOppdater: (endring: Partial<IngrediensRad>) => void;
  onFjern: () => void;
}) {
  const mengdeFelter = (
    <>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="400"
        aria-label="Mengde"
        value={rad.mengde}
        onChange={(hendelse) => onOppdater({ mengde: hendelse.target.value })}
        className="w-20 shrink-0 rounded-lg border border-edge bg-bg px-3 py-2 text-right text-sm tabular-nums text-ink outline-none transition-colors focus:border-accent"
      />
      <select
        aria-label="Enhet"
        value={rad.enhet}
        onChange={(hendelse) =>
          onOppdater({ enhet: hendelse.target.value as Enhet })
        }
        className="shrink-0 rounded-lg border border-edge bg-bg px-2 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
      >
        {ENHETER.map((enhet) => (
          <option key={enhet} value={enhet}>
            {enhet}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onFjern}
        aria-label={`Fjern ${rad.label || "ingrediensen"}`}
        className="shrink-0 rounded-lg border border-edge px-2 py-1.5 text-xs text-ink-3 transition-colors hover:border-accent hover:text-ink"
      >
        ✕
      </button>
    </>
  );

  if (!rad.navngitt) {
    return (
      <div className="rounded-lg border border-edge p-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <OdaVelger
              onVelg={(produkt) =>
                onOppdater({
                  label: produkt.name,
                  odaProduktId: produkt.id,
                  navngitt: true,
                  matvareForslag: naeringsForslag(produkt),
                })
              }
              onBrukSomNavn={(navn) =>
                onOppdater({ label: navn, navngitt: true })
              }
            />
          </div>
          {mengdeFelter}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-edge p-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          autoComplete="off"
          placeholder="Laksefilet"
          aria-label="Ingrediensnavn"
          value={rad.label}
          onChange={(hendelse) => onOppdater({ label: hendelse.target.value })}
          className="w-full min-w-0 flex-1 rounded-lg border border-edge bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
        />
        {mengdeFelter}
      </div>
      {rad.odaProduktId !== null && (
        <p className="mt-1.5 flex items-baseline gap-2 text-xs">
          <span className="min-w-0 flex-1 text-ink-3">→ Oda-produkt koblet</span>
          <button
            type="button"
            onClick={() => onOppdater({ odaProduktId: null })}
            className="shrink-0 text-ink-3 underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
          >
            fjern kobling
          </button>
        </p>
      )}
      <MatvareVelger
        matvare={rad.matvare}
        forslag={rad.matvareForslag ?? undefined}
        onVelg={(matvare) =>
          // Valgt matvare fyller et tomt navnefelt også her – å skrive
          // navnet selv trengs bare når oppskriften sier noe annet enn
          // Matvaretabellen (eller raden er umappet).
          onOppdater(
            matvare !== null && rad.label.trim() === ""
              ? { matvare, label: matvare.name }
              : { matvare },
          )
        }
      />
    </div>
  );
}

// «106 kcal · 22 g protein» per 100 g – samme streng i trefflisten og
// på den valgte koblingen, så tallene kan sammenlignes rett av.
function per100g(matvare: ValgtMatvare): string {
  const kcal = `${Math.round(matvare.kcalPer100g)} kcal`;
  return matvare.proteinPer100g === null
    ? kcal
    : `${kcal} · ${Math.round(matvare.proteinPer100g)} g protein`;
}

// Stabile referanser til server-funksjonene, mappet til hookens form.
async function hentMatvarer(term: string) {
  const svar = await sokMatvarerAction(term);
  return svar.ok ? { ok: true as const, treff: svar.matvarer } : svar;
}

async function hentOdaProdukter(term: string) {
  const svar = await sokOdaProdukterAction(term);
  return svar.ok ? { ok: true as const, treff: svar.produkter } : svar;
}

// «61,90» – priser vises alltid med to desimaler (nb-NO).
function krTekst(verdi: number): string {
  return verdi.toLocaleString("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Kobler ingrediensen til en matvare fra Matvaretabellen – koblingen (og
// den omregnbare mengden) er det som gjør at raden teller i nærings-
// beregningen. Etter et Oda-valg starter søkefeltet ferdig utfylt med
// forslaget, så autosøket kjører av seg selv – næringskoblingen er
// nice-to-have og skal ikke koste mer enn ett klikk (eller null).
function MatvareVelger({
  matvare,
  onVelg,
  forslag,
}: {
  matvare: ValgtMatvare | null;
  onVelg: (matvare: ValgtMatvare | null) => void;
  forslag?: string;
}) {
  const { sok, oppdaterSok, treff, melding, soker } = useAutosok(
    hentMatvarer,
    forslag ?? "",
  );

  if (matvare !== null) {
    return (
      <p className="mt-1.5 flex items-baseline gap-2 text-xs">
        <span className="min-w-0 break-words text-ink-2">
          → {matvare.name}
          <span className="tabular-nums text-ink-3">
            {" "}
            · {per100g(matvare)} per 100 g
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
      <input
        type="text"
        autoComplete="off"
        placeholder="Koble til matvare (søk i Matvaretabellen) …"
        aria-label="Søk i Matvaretabellen"
        value={sok}
        onChange={(hendelse) => oppdaterSok(hendelse.target.value)}
        onKeyDown={(hendelse) => {
          // Enter skal aldri sende hele oppskriftsskjemaet – autosøket
          // håndterer søkingen selv.
          if (hendelse.key === "Enter") {
            hendelse.preventDefault();
          }
        }}
        className="w-full min-w-0 rounded-lg border border-edge bg-bg px-3 py-1.5 text-xs text-ink outline-none transition-colors focus:border-accent"
      />
      {(soker || melding !== null) && (
        <p className="mt-1 text-xs text-ink-3">{soker ? "Søker …" : melding}</p>
      )}
      {treff !== null && treff.length > 0 && (
        <div className="mt-1 rounded-lg border border-edge">
          <p className="flex justify-between gap-3 border-b border-edge px-3 py-1 text-[0.65rem] uppercase tracking-widest text-ink-3">
            <span>Matvare</span>
            <span>per 100 g</span>
          </p>
          <ul className="max-h-48 overflow-y-auto">
            {treff.map((kandidat) => (
              <li key={kandidat.id} className="border-t border-edge first:border-t-0">
                <button
                  type="button"
                  onClick={() => onVelg(kandidat)}
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-xs text-ink-2 transition-colors hover:bg-bg/60 hover:text-ink"
                >
                  <span className="min-w-0 break-words">{kandidat.name}</span>
                  <span className="shrink-0 tabular-nums text-ink-3">
                    {per100g(kandidat)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Søk i den lokale Oda-katalogen – primærveien for nye ingrediensrader
// («man handler hos Oda»). Treffet blir radens navn + lagret
// produktreferanse; pris og pakkebeskrivelse er katalog-cachen og vises
// kun. «Bruk som navn»-utveien dekker det katalogen ikke har.
function OdaVelger({
  onVelg,
  onBrukSomNavn,
}: {
  onVelg: (produkt: OdaProduktTreff) => void;
  onBrukSomNavn: (navn: string) => void;
}) {
  const { sok, oppdaterSok, treff, melding, soker } = useAutosok(
    hentOdaProdukter,
  );

  return (
    <div>
      <input
        type="text"
        autoComplete="off"
        autoFocus
        placeholder="Søk i Oda-katalogen …"
        aria-label="Søk i Oda-katalogen"
        value={sok}
        onChange={(hendelse) => oppdaterSok(hendelse.target.value)}
        onKeyDown={(hendelse) => {
          // Enter skal aldri sende hele oppskriftsskjemaet – autosøket
          // håndterer søkingen selv.
          if (hendelse.key === "Enter") {
            hendelse.preventDefault();
          }
        }}
        className="w-full min-w-0 rounded-lg border border-edge bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
      />
      {(soker || melding !== null) && (
        <p className="mt-1 text-xs text-ink-3">{soker ? "Søker …" : melding}</p>
      )}
      {treff !== null && treff.length > 0 && (
        <div className="mt-1 rounded-lg border border-edge">
          <p className="flex justify-between gap-3 border-b border-edge px-3 py-1 text-[0.65rem] uppercase tracking-widest text-ink-3">
            <span>Oda-produkt</span>
            <span>pris</span>
          </p>
          <ul className="max-h-48 overflow-y-auto">
            {treff.map((produkt) => (
              <li key={produkt.id} className="border-t border-edge first:border-t-0">
                <button
                  type="button"
                  onClick={() => onVelg(produkt)}
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-xs text-ink-2 transition-colors hover:bg-bg/60 hover:text-ink"
                >
                  <span className="min-w-0 break-words">
                    {produkt.name}
                    {produkt.description !== "" && (
                      <span className="text-ink-3"> · {produkt.description}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right tabular-nums text-ink-3">
                    {produkt.price !== null && <>{krTekst(produkt.price)} kr</>}
                    {produkt.unitPrice !== null && (
                      <span className="block text-[0.65rem]">
                        {krTekst(produkt.unitPrice)}/{produkt.unitPriceUnit ?? "enhet"}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {sok.trim() !== "" && (
        <button
          type="button"
          onClick={() => onBrukSomNavn(sok.trim())}
          className="mt-1 text-xs text-ink-3 underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
        >
          Bruk «{sok.trim()}» som navn uten kobling
        </button>
      )}
    </div>
  );
}
