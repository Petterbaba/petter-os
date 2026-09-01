"use client";

import type { Dinner } from "@/lib/types";
import { formatTall } from "@/lib/format";
import { naeringPerPorsjon, naeringsDekning } from "@/lib/ernaering";
import { ArkiverMiddagKnapp } from "./ArkiverMiddagKnapp";

// Middagskatalogen: én kompakt rad per middag som utvides nedover med
// native <details> (mål-mønsteret). «Ny middag»-knappen bor i seksjons-
// hodet; dialogen eies av MatUtforsker.
export function MiddagListe({
  middager,
  onNy,
  onRediger,
}: {
  middager: Dinner[];
  onNy: () => void;
  onRediger: (middag: Dinner) => void;
}) {
  return (
    // overflow-clip, ikke -hidden: hidden gjør seksjonen til scroll-
    // container og dreper sticky-oppførsel (jf. reiselisten).
    <section className="divide-y divide-edge overflow-clip rounded-xl border border-edge bg-card">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Middager
        </h2>
        <div className="flex items-baseline gap-4">
          <p className="text-xs tabular-nums text-ink-3">
            {middager.length}{" "}
            {middager.length === 1 ? "middag" : "middager"}
          </p>
          <button
            type="button"
            onClick={onNy}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
          >
            Ny middag
          </button>
        </div>
      </div>

      {middager.length === 0 && (
        <p className="px-4 py-4 text-sm text-ink-3 sm:px-5">
          Ingen middager ennå – legg inn den første med «Ny middag».
          Ingredienser i gram koblet mot Matvaretabellen gir kcal og
          makroer per porsjon automatisk.
        </p>
      )}

      {middager.map((middag) => (
        <MiddagRad key={middag.id} middag={middag} onRediger={onRediger} />
      ))}
    </section>
  );
}

function MiddagRad({
  middag,
  onRediger,
}: {
  middag: Dinner;
  onRediger: (middag: Dinner) => void;
}) {
  const naering = naeringPerPorsjon(middag);
  const dekning = naeringsDekning(middag);

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-bg/60 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 break-words text-sm font-medium text-ink">
          {middag.title}
        </span>
        <span className="shrink-0 text-xs tabular-nums text-ink-2">
          {naering === null ? "–" : `${Math.round(naering.kcal)} kcal`}
        </span>
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
      <div className="px-4 pb-4 sm:px-5">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Detalj etikett="Porsjoner" verdi={String(middag.servings)} />
          <Detalj
            etikett="Per porsjon"
            verdi={
              naering === null
                ? "–"
                : `${Math.round(naering.kcal)} kcal · ${formatTall(
                    Math.round(naering.proteinG),
                  )} g protein · ${formatTall(Math.round(naering.fatG))} g fett · ${formatTall(
                    Math.round(naering.carbsG),
                  )} g karbo · ${formatTall(Math.round(naering.fiberG))} g fiber`
            }
          />
          {dekning.talte < dekning.totalt && (
            <Detalj
              etikett="Dekning"
              verdi={`næring basert på ${dekning.talte} av ${dekning.totalt} ingredienser`}
            />
          )}
          {middag.sourceUrl && (
            <div className="flex items-baseline gap-2">
              <dt className="shrink-0 text-xs text-ink-3">Kilde</dt>
              <dd className="min-w-0 truncate text-ink-2">
                <a
                  href={middag.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
                >
                  {middag.sourceUrl.replace(/^https?:\/\//, "")}
                </a>
              </dd>
            </div>
          )}
        </dl>

        {middag.ingredients.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-edge pt-3">
            {middag.ingredients.map((rad) => (
              <li key={rad.id} className="flex items-baseline gap-3 text-xs">
                <span className="w-16 shrink-0 text-right tabular-nums text-ink-3">
                  {rad.amountGrams === null
                    ? "–"
                    : `${formatTall(rad.amountGrams)} g`}
                </span>
                <span className="min-w-0 flex-1 break-words text-ink-2">
                  {rad.label}
                  {rad.foodItem !== null && rad.foodItem.name !== rad.label && (
                    <span className="text-ink-3"> · {rad.foodItem.name}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {middag.instructions && (
          <p className="mt-3 whitespace-pre-line break-words border-t border-edge pt-3 text-sm leading-relaxed text-ink-2">
            {middag.instructions}
          </p>
        )}
        {middag.notes && (
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-3">
            {middag.notes}
          </p>
        )}

        <div className="mt-3 flex items-center justify-end gap-2">
          <ArkiverMiddagKnapp id={middag.id} />
          <button
            type="button"
            onClick={() => onRediger(middag)}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
          >
            Rediger
          </button>
        </div>
      </div>
    </details>
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
