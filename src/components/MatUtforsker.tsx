"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import type { Dinner, DinnerPlan } from "@/lib/types";
import { UkesplanKort, type UkeDag } from "./UkesplanKort";
import { MiddagListe } from "./MiddagListe";
import { MiddagSkjema } from "./MiddagSkjema";
import { MiddagDetalj } from "./MiddagDetalj";
import { DagVelger } from "./DagVelger";

// Binder ukesplanen, middagskatalogen og dialogen sammen (reise-/mål-
// mønsteret, utvidet etter HelloFresh-modellen): én native <dialog> huser
// fire innhold – oppskriftsvisning (klikk på middagskort), dagsvalg
// (klikk på dagsrute), nytt og rediger (MiddagSkjema). Ny key per middag
// remounter skjemaets useState-initialverdier når man bytter ny/rediger.
// Handlelisten er en server-rendret slot mellom ukesplan og katalog.
type Innhold =
  | { type: "ny" }
  | { type: "rediger"; middag: Dinner }
  | { type: "vis"; middag: Dinner }
  | { type: "velgDag"; dag: UkeDag };

export function MatUtforsker({
  middager,
  dager,
  planer,
  iDag,
  ukeNummer,
  forrigeUke,
  nesteUke,
  erDenneUken,
  handleliste,
}: {
  middager: Dinner[];
  dager: UkeDag[];
  planer: DinnerPlan[];
  iDag: string;
  ukeNummer: number;
  forrigeUke: string;
  nesteUke: string;
  erDenneUken: boolean;
  handleliste: ReactNode;
}) {
  const [innhold, setInnhold] = useState<Innhold | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function aapne(nyttInnhold: Innhold) {
    setInnhold(nyttInnhold);
    dialogRef.current?.showModal();
  }

  const lukkDialog = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Dialogen viser alltid ferske data: middagen i innholdet er et
  // øyeblikksbilde fra klikket, så etter revalidering slås den opp igjen
  // på id (redigering endrer den; en arkivert middag lukker visningen).
  const middagPerId = new Map(middager.map((middag) => [middag.id, middag]));
  const planPerDag = new Map(planer.map((plan) => [plan.plannedOn, plan]));

  let dialogInnhold: ReactNode = null;
  if (innhold?.type === "ny" || innhold?.type === "rediger") {
    const rediger = innhold.type === "rediger" ? innhold.middag : undefined;
    dialogInnhold = (
      <MiddagSkjema
        key={rediger?.id ?? "ny"}
        rediger={rediger}
        onAvbryt={lukkDialog}
        onLagret={lukkDialog}
      />
    );
  } else if (innhold?.type === "vis") {
    const middag = middagPerId.get(innhold.middag.id);
    dialogInnhold =
      middag === undefined ? null : (
        <MiddagDetalj
          key={middag.id}
          middag={middag}
          dager={dager}
          planer={planer}
          iDag={iDag}
          onRediger={() => setInnhold({ type: "rediger", middag })}
          onLukk={lukkDialog}
        />
      );
  } else if (innhold?.type === "velgDag") {
    dialogInnhold = (
      <DagVelger
        key={innhold.dag.dato}
        dag={innhold.dag}
        plan={planPerDag.get(innhold.dag.dato)}
        middager={middager}
        onLagret={lukkDialog}
        onLukk={lukkDialog}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Native <dialog> gir fokusfelle, Esc og bakteppe uten avhengig-
          heter. Klikk på bakteppet lukker (target er selve dialog-
          elementet kun når klikket traff utenfor innholdet). */}
      <dialog
        ref={dialogRef}
        onClick={(hendelse) => {
          if (hendelse.target === dialogRef.current) {
            lukkDialog();
          }
        }}
        onClose={() => setInnhold(null)}
        className="m-auto w-[calc(100%-2rem)] max-w-2xl rounded-xl border border-edge bg-card p-0 text-ink backdrop:bg-black/60"
      >
        {dialogInnhold}
      </dialog>

      <UkesplanKort
        dager={dager}
        planer={planer}
        middager={middager}
        iDag={iDag}
        ukeNummer={ukeNummer}
        forrigeUke={forrigeUke}
        nesteUke={nesteUke}
        erDenneUken={erDenneUken}
        onVelgDag={(dag) => aapne({ type: "velgDag", dag })}
      />

      {handleliste}

      <MiddagListe
        middager={middager}
        onNy={() => aapne({ type: "ny" })}
        onVis={(middag) => aapne({ type: "vis", middag })}
      />
    </div>
  );
}
