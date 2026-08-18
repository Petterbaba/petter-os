"use client";

import { Fragment } from "react";
import type { Trip } from "@/lib/types";
import { formatDatoKort, formatNok } from "@/lib/format";
import { SlettReiseKnapp } from "./SlettReiseKnapp";

// Årsgruppert liste med sticky overskrifter og én kompakt rad per reise;
// raden utvides nedover med native <details> (samme mønster som journalen).
// navnFor kommer fra server-beregnede landnavn (hydration-trygt – se
// ReiseUtforsker).
export function ReiseListe({
  reiser,
  navnFor,
  onRediger,
}: {
  reiser: Trip[];
  navnFor: (kode: string) => string;
  onRediger: (reise: Trip) => void;
}) {
  if (reiser.length === 0) {
    return (
      <section className="rounded-xl border border-edge bg-card p-4 sm:p-5">
        <p className="text-sm text-ink-3">
          Ingen reiser her ennå – registrer den første over.
        </p>
      </section>
    );
  }

  // Grupper per år – listen er allerede sortert nyest først.
  const grupper: { aar: string; reiser: Trip[] }[] = [];
  for (const reise of reiser) {
    const aar = reise.startedOn.slice(0, 4);
    const siste = grupper[grupper.length - 1];
    if (siste?.aar === aar) {
      siste.reiser.push(reise);
    } else {
      grupper.push({ aar, reiser: [reise] });
    }
  }

  return (
    // overflow-clip, ikke -hidden: hidden gjør seksjonen til scroll-
    // container og dreper sticky-overskriftene; clip klipper hjørnene
    // uten den bivirkningen.
    <section className="divide-y divide-edge overflow-clip rounded-xl border border-edge bg-card">
      {grupper.map((gruppe) => (
        <Fragment key={gruppe.aar}>
          <h3 className="sticky top-0 z-10 bg-card px-4 py-2.5 text-sm font-medium text-ink sm:px-5">
            {gruppe.aar}
          </h3>
          {gruppe.reiser.map((reise) => (
            <details key={reise.id} className="group">
              <summary className="flex cursor-pointer list-none items-baseline gap-3 px-4 py-3 transition-colors hover:bg-bg/60 sm:px-5 [&::-webkit-details-marker]:hidden">
                <time
                  dateTime={reise.startedOn}
                  className="w-28 shrink-0 text-xs tabular-nums text-ink-3"
                >
                  {datoOmraade(reise.startedOn, reise.endedOn)}
                </time>
                <span className="min-w-0 flex-1 break-words text-sm font-medium text-ink">
                  {reise.title}
                </span>
                <span className="hidden shrink-0 text-xs text-ink-3 sm:inline">
                  {navnFor(reise.countryCode)}
                </span>
                {reise.rating !== null && (
                  <span className="shrink-0 text-xs text-ink-3">
                    {reise.rating}/5
                  </span>
                )}
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 self-center text-ink-3 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="px-4 pb-4 sm:px-5 sm:pl-[6.5rem]">
                <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <Detalj etikett="Land" verdi={navnFor(reise.countryCode)} />
                  {reise.city && <Detalj etikett="By" verdi={reise.city} />}
                  <Detalj etikett="Netter" verdi={String(netter(reise))} />
                  {reise.category && (
                    <Detalj
                      etikett="Kategori"
                      verdi={
                        reise.category.charAt(0).toUpperCase() +
                        reise.category.slice(1)
                      }
                    />
                  )}
                  {reise.companions && (
                    <Detalj etikett="Hvem" verdi={reise.companions} />
                  )}
                  {reise.costNok !== null && (
                    <Detalj etikett="Kostnad" verdi={formatNok(reise.costNok)} />
                  )}
                </dl>
                {reise.notes && (
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">
                    {reise.notes}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-end gap-2">
                  <SlettReiseKnapp id={reise.id} />
                  <button
                    type="button"
                    onClick={() => onRediger(reise)}
                    className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
                  >
                    Rediger
                  </button>
                </div>
              </div>
            </details>
          ))}
        </Fragment>
      ))}
    </section>
  );
}

function Detalj({ etikett, verdi }: { etikett: string; verdi: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 text-xs text-ink-3">{etikett}</dt>
      <dd className="min-w-0 break-words text-ink-2">{verdi}</dd>
    </div>
  );
}

function datoOmraade(fra: string, til: string): string {
  return fra === til
    ? formatDatoKort(fra)
    : `${formatDatoKort(fra)}–${formatDatoKort(til)}`;
}

// Avledet – lagres aldri. Datoene er rene «YYYY-MM-DD», så UTC-parsing
// gir eksakt døgndifferanse uten sommertidsfeller.
function netter(reise: Trip): number {
  return Math.round(
    (Date.parse(reise.endedOn) - Date.parse(reise.startedOn)) / 86_400_000,
  );
}
