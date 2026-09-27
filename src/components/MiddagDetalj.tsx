"use client";

import { useActionState } from "react";
import { planleggMiddagAction } from "@/app/mat/actions";
import type { Dinner, DinnerPlan } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import type { UkeDag } from "./UkesplanKort";
import { MiddagOversikt } from "./MiddagOversikt";

// Oppskriftsvisningen i dialogen (HelloFresh-mønsteret: klikk på et kort
// åpner hele retten som overlegg). Nederst velger man hvilke dager i den
// viste uken retten skal inn på – én liten form per dag (slett-knapp-
// mønsteret), så en dag som alt har retten kan fjernes med samme knapp.
export function MiddagDetalj({
  middag,
  dager,
  planer,
  iDag,
  onRediger,
  onLukk,
}: {
  middag: Dinner;
  dager: UkeDag[];
  planer: DinnerPlan[];
  iDag: string;
  onRediger: () => void;
  onLukk: () => void;
}) {
  const planPerDag = new Map(planer.map((plan) => [plan.plannedOn, plan]));

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-ink-3">
            Middag
          </p>
          <h2 className="mt-1 break-words text-lg font-semibold leading-snug text-ink">
            {middag.title}
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

      <MiddagOversikt middag={middag} />

      {middag.instructions && (
        <section className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-widest text-ink-3">
            Fremgangsmåte
          </h3>
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">
            {middag.instructions}
          </p>
        </section>
      )}

      {middag.notes && (
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-ink-3">
          {middag.notes}
        </p>
      )}

      {middag.sourceUrl && (
        <p className="mt-3 truncate text-xs text-ink-3">
          Kilde:{" "}
          <a
            href={middag.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
          >
            {middag.sourceUrl.replace(/^https?:\/\//, "")}
          </a>
        </p>
      )}

      <section className="mt-5 border-t border-edge pt-4">
        <h3 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Legg i ukesplanen
        </h3>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {dager.map((dag) => (
            <PlanleggKnapp
              key={dag.dato}
              dag={dag}
              erIDag={dag.dato === iDag}
              middagId={middag.id}
              plan={planPerDag.get(dag.dato)}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-3">
          Trykk på en dag for å planlegge retten der. Trykk igjen for å ta
          den bort.
        </p>
      </section>

      <div className="mt-5 flex items-center justify-end">
        <button
          type="button"
          onClick={onRediger}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
        >
          Rediger
        </button>
      </div>
    </div>
  );
}

// Én knapp per dag: valgt (retten står der alt) → fjerner; ellers legger
// den inn (upsert bytter en annen middag som sto der). Ny key fra
// forelder trengs ikke – knappen leser plan-prop som revalideres.
function PlanleggKnapp({
  dag,
  erIDag,
  middagId,
  plan,
}: {
  dag: UkeDag;
  erIDag: boolean;
  middagId: string;
  plan: DinnerPlan | undefined;
}) {
  const [resultat, handling, venter] = useActionState<
    ActionResultat | undefined,
    FormData
  >(planleggMiddagAction, undefined);

  const erValgt = plan?.dinnerId === middagId;
  const harAnnen = plan !== undefined && !erValgt;

  return (
    <form action={handling} className="min-w-0">
      <input type="hidden" name="dato" value={dag.dato} />
      <input type="hidden" name="middag" value={erValgt ? "" : middagId} />
      <button
        type="submit"
        disabled={venter}
        aria-pressed={erValgt}
        aria-label={`${dag.ukedagLang} ${dag.dato.slice(8, 10)}.${
          erValgt ? " – planlagt, trykk for å fjerne" : harAnnen ? " – annen middag planlagt" : ""
        }`}
        title={
          harAnnen ? `Bytter ut middagen som står der` : undefined
        }
        className={`flex w-full flex-col items-center rounded-lg border py-1.5 text-xs transition-colors disabled:opacity-50 ${
          erValgt
            ? "border-accent bg-card text-ink"
            : harAnnen
              ? "border-dashed border-axis text-ink-3 hover:border-accent hover:text-ink"
              : "border-edge text-ink-2 hover:border-accent hover:text-ink"
        }`}
      >
        <span
          className={`uppercase tracking-wider ${erIDag ? "font-medium text-ink" : ""}`}
        >
          {dag.ukedag}
        </span>
        <span className="tabular-nums">{Number(dag.dato.slice(8, 10))}</span>
      </button>
      {resultat && !resultat.ok && (
        <p role="alert" className="mt-1 text-[0.65rem] text-ink-3">
          {resultat.melding}
        </p>
      )}
    </form>
  );
}
