"use client";

import { useRef, useState } from "react";
import type { Goal, GoalEntry, MetrikkType } from "@/lib/types";
import { MisogiKort } from "./MisogiKort";
import { MaalListe } from "./MaalListe";
import { MaalSkjema } from "./MaalSkjema";
import { MisogiSkjema } from "./MisogiSkjema";
import { MisogiUtfallSkjema } from "./MisogiUtfallSkjema";
import { FremdriftSkjema } from "./FremdriftSkjema";

// Binder misogi-kortet, mål-listen og dialogen sammen (reise-mønsteret).
// Én native <dialog> huser alle fire skjemaene; union-staten sier hvilket
// som vises, og ny key per mål remounter useState-initialverdiene.
type DialogInnhold =
  | { type: "maal"; rediger?: Goal }
  | { type: "misogi"; rediger?: Goal }
  | { type: "utfall"; maal: Goal }
  | { type: "fremdrift"; maal: Goal };

export function MaalUtforsker({
  maal,
  logg,
  metrikkTyper,
  iDag,
}: {
  maal: Goal[];
  logg: GoalEntry[];
  metrikkTyper: MetrikkType[];
  iDag: string;
}) {
  const [innhold, setInnhold] = useState<DialogInnhold | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const aar = Number(iDag.slice(0, 4));
  const misogier = maal.filter((punkt) => punkt.kind === "misogi");
  const fremdriftsmaal = maal.filter((punkt) => punkt.kind === "maal");
  const opptatteAar = misogier
    .map((punkt) => punkt.misogiYear)
    .filter((misogiAar): misogiAar is number => misogiAar !== null);

  function aapne(nyttInnhold: DialogInnhold) {
    setInnhold(nyttInnhold);
    dialogRef.current?.showModal();
  }

  function lukkDialog() {
    dialogRef.current?.close();
  }

  return (
    <div className="space-y-4">
      <MisogiKort
        misogier={misogier}
        aar={aar}
        onNy={() => aapne({ type: "misogi" })}
        onRediger={(misogi) => aapne({ type: "misogi", rediger: misogi })}
        onUtfall={(misogi) => aapne({ type: "utfall", maal: misogi })}
      />

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
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-edge bg-card p-0 text-ink backdrop:bg-black/60"
      >
        {/* Ny key per mål: useState-initialverdiene (modus, utfall m.m.)
            leses på nytt når man bytter mellom ny/rediger. */}
        {innhold?.type === "maal" && (
          <MaalSkjema
            key={innhold.rediger?.id ?? "ny"}
            metrikkTyper={metrikkTyper}
            standardDato={iDag}
            rediger={innhold.rediger}
            onAvbryt={lukkDialog}
            onLagret={lukkDialog}
          />
        )}
        {innhold?.type === "misogi" && (
          <MisogiSkjema
            key={innhold.rediger?.id ?? "ny"}
            standardAar={aar}
            opptatteAar={opptatteAar}
            rediger={innhold.rediger}
            onAvbryt={lukkDialog}
            onLagret={lukkDialog}
          />
        )}
        {innhold?.type === "utfall" && (
          <MisogiUtfallSkjema
            key={innhold.maal.id}
            maal={innhold.maal}
            onAvbryt={lukkDialog}
            onLagret={lukkDialog}
          />
        )}
        {innhold?.type === "fremdrift" && (
          <FremdriftSkjema
            key={innhold.maal.id}
            maal={innhold.maal}
            standardDato={iDag}
            onAvbryt={lukkDialog}
            onLagret={lukkDialog}
          />
        )}
      </dialog>

      <MaalListe
        maal={fremdriftsmaal}
        logg={logg}
        metrikkTyper={metrikkTyper}
        iDag={iDag}
        onNytt={() => aapne({ type: "maal" })}
        onRediger={(punkt) => aapne({ type: "maal", rediger: punkt })}
        onLoggFremdrift={(punkt) => aapne({ type: "fremdrift", maal: punkt })}
      />
    </div>
  );
}
