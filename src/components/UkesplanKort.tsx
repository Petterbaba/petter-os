"use client";

import { useActionState } from "react";
import Link from "next/link";
import { planleggMiddagAction } from "@/app/mat/actions";
import type { Dinner, DinnerPlan } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import { formatDatoKort } from "@/lib/format";
import { naeringPerPorsjon } from "@/lib/ernaering";

// Ukesplanen: én rad per dag med nedtrekksvalg som lagrer ved endring
// (én liten form per dag – slett-knapp-mønsteret, bare med select).
// Ukedagsnavnene beregnes på serveren (jf. landnavn-kommentaren i
// ReiseUtforsker: Node og nettleser kan ha ulike CLDR-versjoner).
export function UkesplanKort({
  dager,
  planer,
  middager,
  iDag,
  ukeNummer,
  forrigeUke,
  nesteUke,
  erDenneUken,
}: {
  dager: { dato: string; ukedag: string }[];
  planer: DinnerPlan[];
  middager: Dinner[];
  iDag: string;
  ukeNummer: number;
  forrigeUke: string;
  nesteUke: string;
  erDenneUken: boolean;
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
    <section className="rounded-xl border border-edge bg-card">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5">
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

      <div className="divide-y divide-edge border-t border-edge">
        {dager.map((dag) => (
          <DagRad
            key={dag.dato}
            dag={dag}
            erIDag={dag.dato === iDag}
            plan={planPerDag.get(dag.dato)}
            middager={middager}
            middagPerId={middagPerId}
          />
        ))}
      </div>

      <p className="px-4 py-3 text-xs text-ink-3 sm:px-5">
        {planlagte.length} av {dager.length} dager planlagt
        {snittKcal !== null && snittProtein !== null && (
          <span className="tabular-nums">
            {" "}
            · snitt {Math.round(snittKcal)} kcal /{" "}
            {Math.round(snittProtein)} g protein per porsjon
          </span>
        )}
      </p>
    </section>
  );
}

function DagRad({
  dag,
  erIDag,
  plan,
  middager,
  middagPerId,
}: {
  dag: { dato: string; ukedag: string };
  erIDag: boolean;
  plan: DinnerPlan | undefined;
  middager: Dinner[];
  middagPerId: Map<string, Dinner>;
}) {
  const [resultat, handling, venter] = useActionState<
    ActionResultat | undefined,
    FormData
  >(planleggMiddagAction, undefined);

  const valgtMiddag = plan === undefined ? undefined : middagPerId.get(plan.dinnerId);
  const naering = valgtMiddag === undefined ? null : naeringPerPorsjon(valgtMiddag);

  return (
    <form action={handling} className="px-4 py-2.5 sm:px-5">
      <input type="hidden" name="dato" value={dag.dato} />
      <div className="flex items-center gap-3">
        <span
          className={`w-16 shrink-0 text-xs ${
            erIDag ? "font-medium text-ink" : "text-ink-3"
          }`}
        >
          {dag.ukedag} {Number(dag.dato.slice(8, 10))}.
        </span>
        {/* Ny key når serverens plan endres: da remountes selecten med
            fersk defaultValue etter revalidering (ukontrollert ellers). */}
        <select
          key={plan?.id ?? "tom"}
          name="middag"
          defaultValue={valgtMiddag?.id ?? ""}
          aria-label={`Middag ${dag.ukedag} ${formatDatoKort(dag.dato)}`}
          onChange={(hendelse) => hendelse.currentTarget.form?.requestSubmit()}
          disabled={venter}
          className="w-full min-w-0 flex-1 rounded-lg border border-edge bg-bg px-3 py-1.5 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-50"
        >
          <option value="">–</option>
          {middager.map((middag) => (
            <option key={middag.id} value={middag.id}>
              {middag.title}
            </option>
          ))}
        </select>
        <span className="w-16 shrink-0 text-right text-xs tabular-nums text-ink-3">
          {naering === null ? "" : `${Math.round(naering.kcal)} kcal`}
        </span>
      </div>
      {resultat && !resultat.ok && (
        <p role="alert" className="mt-1 text-xs text-ink-3">
          {resultat.melding}
        </p>
      )}
    </form>
  );
}
