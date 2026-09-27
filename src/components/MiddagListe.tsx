"use client";

import Link from "next/link";
import type { Dinner } from "@/lib/types";
import { naeringPerPorsjon } from "@/lib/ernaering";

// Middagskatalogen som rutenett av kort (HelloFresh-mønsteret): kortet
// viser tittel, kcal og protein per porsjon, og klikk åpner hele
// oppskriften i dialogen (MiddagDetalj, eid av MatUtforsker) – kortene
// utvider seg aldri på stedet. «Ny middag»-lenken i seksjonshodet går til
// editoren i kokeboken (/kokebok/ny).
export function MiddagListe({
  middager,
  onVis,
}: {
  middager: Dinner[];
  onVis: (middag: Dinner) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Middager
        </h2>
        <div className="flex items-baseline gap-4">
          <p className="text-xs tabular-nums text-ink-3">
            {middager.length}{" "}
            {middager.length === 1 ? "middag" : "middager"}
          </p>
          <Link
            href="/kokebok/ny"
            className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
          >
            Ny middag
          </Link>
        </div>
      </div>

      {middager.length === 0 && (
        <p className="rounded-xl border border-dashed border-edge px-4 py-4 text-sm text-ink-3 sm:px-5">
          Ingen middager ennå – legg inn den første med «Ny middag».
          Ingredienser i gram koblet mot Matvaretabellen gir kcal og
          makroer per porsjon automatisk.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {middager.map((middag) => (
          <MiddagKort key={middag.id} middag={middag} onVis={onVis} />
        ))}
      </div>
    </section>
  );
}

function MiddagKort({
  middag,
  onVis,
}: {
  middag: Dinner;
  onVis: (middag: Dinner) => void;
}) {
  const naering = naeringPerPorsjon(middag);

  return (
    <button
      type="button"
      onClick={() => onVis(middag)}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-edge bg-card p-4 text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span className="min-w-0 break-words text-sm font-medium leading-snug text-ink">
        {middag.title}
      </span>
      <span className="flex items-baseline gap-4 text-xs tabular-nums text-ink-3">
        <span>
          <span className="text-lg font-semibold leading-none text-ink">
            {naering === null ? "–" : Math.round(naering.kcal)}
          </span>{" "}
          kcal
        </span>
        <span>
          <span className="text-ink-2">
            {naering === null ? "–" : `${Math.round(naering.proteinG)} g`}
          </span>{" "}
          protein
        </span>
        <span className="ml-auto">
          <span className="text-ink-2">{middag.servings}</span>{" "}
          {middag.servings === 1 ? "porsjon" : "porsjoner"}
        </span>
      </span>
    </button>
  );
}
