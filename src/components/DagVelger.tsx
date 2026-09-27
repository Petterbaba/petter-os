"use client";

import { useActionState, useEffect } from "react";
import { planleggMiddagAction } from "@/app/mat/actions";
import type { Dinner, DinnerPlan } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { formatDato } from "@/lib/format";
import { naeringPerPorsjon } from "@/lib/ernaering";
import type { UkeDag } from "./UkesplanKort";
import { MiddagOversikt } from "./MiddagOversikt";
import { SirkelIkon } from "./SirkelIkon";

// Dagsvalget i dialogen: klikk på en dagsrute i ukesplanen åpner listen
// over middager med en pluss-knapp per rett (HelloFresh-mønsteret sett
// fra dagen); den valgte retten har minus i stedet (fjerner, som
// minus-knappen på dagskortet). Én liten form per rad; vellykket lagring
// lukker dialogen.
// Har dagen alt en middag, vises den øverst (næring + ingredienser, delt
// med MiddagDetalj) med «Fjern» rett under – listen blir da «Bytt middag».
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
  const valgt =
    plan === undefined
      ? undefined
      : middager.find((middag) => middag.id === plan.dinnerId);

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

      {plan !== undefined && (
        <section className="mb-5 rounded-xl border border-edge p-3 sm:p-4">
          {valgt === undefined ? (
            <p className="text-sm text-ink-3">
              Middagen som sto her finnes ikke lenger i katalogen.
            </p>
          ) : (
            <>
              <h3 className="mb-3 break-words text-base font-semibold leading-snug text-ink">
                {valgt.title}
              </h3>
              <MiddagOversikt middag={valgt} />
            </>
          )}
          <FjernForm dato={dag.dato} onLagret={onLagret} />
        </section>
      )}

      {plan !== undefined && middager.length > 0 && (
        <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-3">
          Bytt middag
        </h3>
      )}

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
              dag={dag}
              middag={middag}
              erValgt={plan?.dinnerId === middag.id}
              onLagret={onLagret}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function VelgRad({
  dag,
  middag,
  erValgt,
  onLagret,
}: {
  dag: UkeDag;
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
        <input type="hidden" name="dato" value={dag.dato} />
        <input type="hidden" name="middag" value={erValgt ? "" : middag.id} />
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
          disabled={venter}
          aria-label={
            erValgt
              ? `Fjern ${middag.title} fra ${dag.ukedagLang}`
              : `Velg ${middag.title} for ${dag.ukedagLang}`
          }
          title={erValgt ? "Fjern middagen fra dagen" : "Velg middagen"}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors hover:bg-bg hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:animate-pulse disabled:opacity-50 ${
            erValgt ? "text-accent" : "text-ink-3"
          }`}
        >
          <SirkelIkon tegn={erValgt ? "minus" : "pluss"} className="h-5 w-5" />
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
