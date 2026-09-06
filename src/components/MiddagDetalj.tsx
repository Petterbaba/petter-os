"use client";

import { useActionState } from "react";
import { planleggMiddagAction } from "@/app/mat/actions";
import type { Dinner, DinnerPlan } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { formatTall } from "@/lib/format";
import { naeringPerPorsjon, naeringsDekning } from "@/lib/ernaering";
import type { UkeDag } from "./UkesplanKort";

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
  const naering = naeringPerPorsjon(middag);
  const dekning = naeringsDekning(middag);
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

      {/* Næring per porsjon som fire småtall – tallet stort, enheten liten. */}
      <dl className="grid grid-cols-4 gap-2 rounded-lg border border-edge bg-bg p-3">
        <Tall
          etikett="kcal"
          verdi={naering === null ? "–" : String(Math.round(naering.kcal))}
        />
        <Tall
          etikett="protein"
          verdi={naering === null ? "–" : `${Math.round(naering.proteinG)} g`}
        />
        <Tall
          etikett="fett"
          verdi={naering === null ? "–" : `${Math.round(naering.fatG)} g`}
        />
        <Tall
          etikett="karbo"
          verdi={naering === null ? "–" : `${Math.round(naering.carbsG)} g`}
        />
      </dl>
      <p className="mt-1.5 text-xs tabular-nums text-ink-3">
        Per porsjon · {middag.servings}{" "}
        {middag.servings === 1 ? "porsjon" : "porsjoner"} i oppskriften
        {naering !== null && ` · ${Math.round(naering.fiberG)} g fiber`}
        {dekning.talte < dekning.totalt &&
          ` · basert på ${dekning.talte} av ${dekning.totalt} ingredienser`}
      </p>

      {middag.ingredients.length > 0 && (
        <section className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-widest text-ink-3">
            Ingredienser
          </h3>
          <ul className="mt-2 divide-y divide-edge">
            {middag.ingredients.map((rad) => (
              <li key={rad.id} className="flex items-baseline gap-3 py-1.5 text-sm">
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-ink-3">
                  {rad.amount === null
                    ? "etter smak"
                    : `${formatTall(rad.amount)} ${rad.unit}`}
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
        </section>
      )}

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

function Tall({ etikett, verdi }: { etikett: string; verdi: string }) {
  return (
    <div className="min-w-0 text-center">
      <dd className="text-base font-semibold tabular-nums leading-none text-ink">
        {verdi}
      </dd>
      <dt className="mt-1 text-[0.65rem] uppercase tracking-widest text-ink-3">
        {etikett}
      </dt>
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
