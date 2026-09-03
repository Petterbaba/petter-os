"use client";

import { useActionState, useEffect } from "react";
import { planleggMiddagAction } from "@/app/mat/actions";
import type { Dinner, DinnerPlan } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { formatDato } from "@/lib/format";
import { naeringPerPorsjon } from "@/lib/ernaering";
import type { UkeDag } from "./UkesplanKort";

// Dagsvalget i dialogen: klikk på en dagsrute i ukesplanen åpner listen
// over middager med én «Velg»-knapp per rett (HelloFresh-mønsteret sett
// fra dagen). Én liten form per rad; vellykket lagring lukker dialogen.
export function DagVelger({
  dag,
  plan,
  middager,
  onLagret,
  onLukk,
}: {
  dag: UkeDag;
  plan: DinnerPlan | undefined;
  middager: Dinner[];
  onLagret: () => void;
  onLukk: () => void;
}) {
  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-ink-3">
            Velg middag
          </p>
          <h2 className="mt-1 text-lg font-semibold leading-snug text-ink">
            <span className="capitalize">{dag.ukedagLang}</span>{" "}
            {formatDato(dag.dato)}
          </h2>
        </div>
        <button
          type="button"
          onClick={onLukk}
          className="shrink-0 text-xs text-ink-3 transition-colors hover:text-ink"
        >
          Lukk
        </button>
      </div>

      {middager.length === 0 ? (
        <p className="text-sm text-ink-3">
          Ingen middager i katalogen ennå – legg inn den første med «Ny
          middag».
        </p>
      ) : (
        <ul className="divide-y divide-edge rounded-lg border border-edge">
          {middager.map((middag) => (
            <VelgRad
              key={middag.id}
              dato={dag.dato}
              middag={middag}
              erValgt={plan?.dinnerId === middag.id}
              onLagret={onLagret}
            />
          ))}
        </ul>
      )}

      {plan !== undefined && (
        <FjernForm dato={dag.dato} onLagret={onLagret} />
      )}
    </div>
  );
}

function VelgRad({
  dato,
  middag,
  erValgt,
  onLagret,
}: {
  dato: string;
  middag: Dinner;
  erValgt: boolean;
  onLagret: () => void;
}) {
  const [resultat, handling, venter] = useActionState<
    ActionResultat | undefined,
    FormData
  >(planleggMiddagAction, undefined);
  const naering = naeringPerPorsjon(middag);

  useEffect(() => {
    if (resultat?.ok) onLagret();
  }, [resultat, onLagret]);

  return (
    <li>
      <form
        action={handling}
        className="flex items-center gap-3 px-3 py-2"
      >
        <input type="hidden" name="dato" value={dato} />
        <input type="hidden" name="middag" value={middag.id} />
        <span className="min-w-0 flex-1">
          <span className="block break-words text-sm text-ink">
            {middag.title}
          </span>
          <span className="block text-xs tabular-nums text-ink-3">
            {naering === null
              ? "næring ikke beregnet"
              : `${Math.round(naering.kcal)} kcal · ${Math.round(
                  naering.proteinG,
                )} g protein`}
          </span>
          {resultat && !resultat.ok && (
            <span role="alert" className="block text-xs text-ink-3">
              {resultat.melding}
            </span>
          )}
        </span>
        <button
          type="submit"
          disabled={venter || erValgt}
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
            erValgt
              ? "border-accent text-ink"
              : "border-edge text-ink hover:border-accent"
          }`}
        >
          {erValgt ? "Valgt" : venter ? "Lagrer …" : "Velg"}
        </button>
      </form>
    </li>
  );
}

function FjernForm({
  dato,
  onLagret,
}: {
  dato: string;
  onLagret: () => void;
}) {
  const [resultat, handling, venter] = useActionState<
    ActionResultat | undefined,
    FormData
  >(planleggMiddagAction, undefined);

  useEffect(() => {
    if (resultat?.ok) onLagret();
  }, [resultat, onLagret]);

  return (
    <form action={handling} className="mt-3 flex items-center justify-end gap-3">
      <input type="hidden" name="dato" value={dato} />
      <input type="hidden" name="middag" value="" />
      {resultat && !resultat.ok && (
        <p role="alert" className="text-xs text-ink-3">
          {resultat.melding}
        </p>
      )}
      <button
        type="submit"
        disabled={venter}
        aria-label="Fjern middagen fra denne dagen"
        className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent disabled:opacity-50"
      >
        {venter ? "Fjerner …" : "Fjern"}
      </button>
    </form>
  );
}
