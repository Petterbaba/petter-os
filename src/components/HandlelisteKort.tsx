"use client";

import type { Dinner, DinnerPlan } from "@/lib/types";
import { formatTall } from "@/lib/format";
import { aggregerHandleliste } from "@/lib/ernaering";
import { UtvidPil } from "./UtvidPil";

// Aggregert handleliste for ukens planlagte middager – ett utvidbart kort:
// lukket viser antall varer og retter, åpnet selve listen (ren visning av
// aggregerHandleliste; like ingredienser slås sammen på tvers av retter).
// Kurv-fylling hos Oda skjer i Claude-økt, ikke herfra.
export function HandlelisteKort({
  planer,
  middager,
}: {
  planer: DinnerPlan[];
  middager: Dinner[];
}) {
  const linjer = aggregerHandleliste(planer, middager);
  const middagIder = new Set(middager.map((middag) => middag.id));
  const antallRetter = planer.filter((plan) => middagIder.has(plan.dinnerId)).length;

  return (
    <details className="group rounded-xl border border-edge bg-card transition-colors hover:border-axis">
      <summary className="flex cursor-pointer list-none items-baseline gap-3 rounded-xl px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-5 [&::-webkit-details-marker]:hidden">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Handleliste
        </h2>
        <p className="min-w-0 flex-1 text-xs tabular-nums text-ink-2">
          {linjer.length === 0
            ? "ingen planlagte middager"
            : `${linjer.length} ${linjer.length === 1 ? "vare" : "varer"} · ${antallRetter} ${
                antallRetter === 1 ? "rett" : "retter"
              }`}
        </p>
        <UtvidPil className="self-center" />
      </summary>

      {linjer.length === 0 ? (
        <p className="border-t border-edge px-4 py-4 text-sm text-ink-3 sm:px-5">
          Planlegg middager i ukesplanen, så samles ingrediensene her.
        </p>
      ) : (
        <ul className="divide-y divide-edge border-t border-edge">
          {linjer.map((linje, indeks) => (
            <li
              key={`${indeks}-${linje.label}`}
              className="flex items-baseline gap-3 px-4 py-2 text-sm sm:px-5"
            >
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-ink-3">
                {linje.grams === null ? "–" : `${formatTall(linje.grams)} g`}
              </span>
              <span className="min-w-0 flex-1 break-words text-ink-2">
                {linje.label}
              </span>
              {linje.antallRetter > 1 && (
                <span className="shrink-0 text-xs tabular-nums text-ink-3">
                  {linje.antallRetter} retter
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
