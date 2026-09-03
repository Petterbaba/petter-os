"use client";

import Link from "next/link";
import type { Dinner, DinnerPlan } from "@/lib/types";
import { naeringPerPorsjon } from "@/lib/ernaering";
import { UkesmenyKnapp } from "./UkesmenyKnapp";

// Én dag i den viste uken. Navnene beregnes på serveren og sendes som
// props (jf. landnavn-kommentaren i ReiseUtforsker: Node og nettleser kan
// ha ulike CLDR-versjoner, og et avvik ville gitt hydration-feil).
export type UkeDag = {
  dato: string;
  ukedag: string; // «man»
  ukedagLang: string; // «mandag»
};

// Ukesplanen som rekke av sju dagsruter pluss et ukessum-kort. Rutene
// utvider seg ikke – klikk åpner dagsvalget i dialogen (eies av
// MatUtforsker), HelloFresh-mønsteret sett fra dagen.
export function UkesplanKort({
  dager,
  planer,
  middager,
  iDag,
  ukeNummer,
  forrigeUke,
  nesteUke,
  erDenneUken,
  onVelgDag,
}: {
  dager: UkeDag[];
  planer: DinnerPlan[];
  middager: Dinner[];
  iDag: string;
  ukeNummer: number;
  forrigeUke: string;
  nesteUke: string;
  erDenneUken: boolean;
  onVelgDag: (dag: UkeDag) => void;
}) {
  const planPerDag = new Map(planer.map((plan) => [plan.plannedOn, plan]));
  const middagPerId = new Map(middager.map((middag) => [middag.id, middag]));

  // Ukens næringsbilde: snitt per porsjon over dagene som både er planlagt
  // og kan beregnes (naeringPerPorsjon svarer null ellers).
  const planlagte = planer.filter((plan) => middagPerId.has(plan.dinnerId));
  const beregnede = planlagte
    .map((plan) => naeringPerPorsjon(middagPerId.get(plan.dinnerId)!))
    .filter((naering) => naering !== null);
  const snittKcal =
    beregnede.length === 0
      ? null
      : beregnede.reduce((sum, naering) => sum + naering.kcal, 0) /
        beregnede.length;
  const snittProtein =
    beregnede.length === 0
      ? null
      : beregnede.reduce((sum, naering) => sum + naering.proteinG, 0) /
        beregnede.length;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Ukesplan · uke {ukeNummer}
        </h2>
        <nav aria-label="Ukenavigasjon" className="flex items-baseline gap-3 text-xs">
          <Link
            href={`/mat?uke=${forrigeUke}`}
            className="text-ink-3 transition-colors hover:text-ink"
          >
            ‹ forrige
          </Link>
          {!erDenneUken && (
            <Link
              href="/mat"
              className="text-ink-3 underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
            >
              denne uken
            </Link>
          )}
          <Link
            href={`/mat?uke=${nesteUke}`}
            className="text-ink-3 transition-colors hover:text-ink"
          >
            neste ›
          </Link>
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {dager.map((dag) => {
          const plan = planPerDag.get(dag.dato);
          const middag = plan === undefined ? undefined : middagPerId.get(plan.dinnerId);
          const naering = middag === undefined ? null : naeringPerPorsjon(middag);
          const erIDag = dag.dato === iDag;
          return (
            <button
              key={dag.dato}
              type="button"
              onClick={() => onVelgDag(dag)}
              aria-label={`${dag.ukedagLang} ${Number(dag.dato.slice(8, 10))}. – ${
                middag === undefined ? "velg middag" : `${middag.title}, bytt middag`
              }`}
              className={`flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                erIDag ? "border-accent" : "border-edge"
              }`}
            >
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-xs uppercase tracking-widest ${
                    erIDag ? "font-medium text-ink" : "text-ink-3"
                  }`}
                >
                  {dag.ukedag}
                </span>
                <span className="text-xl font-semibold tabular-nums leading-none text-ink">
                  {Number(dag.dato.slice(8, 10))}
                </span>
              </span>
              <span
                className={`min-h-10 break-words text-sm leading-snug ${
                  middag === undefined ? "text-ink-3" : "text-ink"
                }`}
              >
                {middag?.title ?? "Velg middag"}
              </span>
              <span className="text-xs tabular-nums text-ink-3">
                {naering === null
                  ? " "
                  : `${Math.round(naering.kcal)} kcal · ${Math.round(
                      naering.proteinG,
                    )} g protein`}
              </span>
            </button>
          );
        })}

        {/* Ukessummen er avledet, ikke en dag – stiplet kant skiller den.
            Ukesmeny-knappen bor her: den handler om uken, ikke én dag. */}
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-edge p-3">
          <span className="text-xs uppercase tracking-widest text-ink-3">
            Uken
          </span>
          <p className="text-xl font-semibold tabular-nums leading-none text-ink">
            {planlagte.length}
            <span className="text-sm font-normal text-ink-3">
              {" "}
              / {dager.length}
            </span>
          </p>
          <p className="text-xs text-ink-3">dager planlagt</p>
          <p className="text-xs tabular-nums text-ink-3">
            {snittKcal !== null && snittProtein !== null
              ? `snitt ${Math.round(snittKcal)} kcal · ${Math.round(
                  snittProtein,
                )} g protein`
              : " "}
          </p>
          <UkesmenyKnapp
            mandag={dager[0].dato}
            ledigeDager={dager.length - planlagte.length}
          />
        </div>
      </div>
    </section>
  );
}
