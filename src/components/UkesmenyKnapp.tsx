"use client";

import { useActionState } from "react";
import { lagUkesmenyAction } from "@/app/mat/actions";
import type { ActionResultat } from "@/lib/actions";

// «Lag ukesmeny» i Uken-ruten: fyller de ledige dagene med retter fra
// katalogen (utvalgsreglene bor i src/lib/ukesmeny.ts). Er uken full,
// blir knappen «Ny ukesmeny» og bytter alle sju dagene – planlegging er
// billig å angre (velg på nytt per dag), så ingen bekreftelsesdialog.
export function UkesmenyKnapp({
  mandag,
  ledigeDager,
}: {
  mandag: string;
  ledigeDager: number;
}) {
  const [resultat, handling, venter] = useActionState<
    ActionResultat | undefined,
    FormData
  >(lagUkesmenyAction, undefined);
  const erstatt = ledigeDager === 0;

  return (
    <form action={handling} className="mt-auto pt-1">
      <input type="hidden" name="mandag" value={mandag} />
      <input type="hidden" name="modus" value={erstatt ? "erstatt" : "fyll"} />
      <button
        type="submit"
        disabled={venter}
        title={
          erstatt
            ? "Bytter ut alle sju dagene"
            : `Fyller ${ledigeDager === 1 ? "den ledige dagen" : `de ${ledigeDager} ledige dagene`}`
        }
        className="w-full rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent disabled:opacity-50"
      >
        {venter ? "Lager …" : erstatt ? "Ny ukesmeny" : "Lag ukesmeny"}
      </button>
      {resultat && (
        <p
          role={resultat.ok ? "status" : "alert"}
          className="mt-1.5 line-clamp-2 text-xs text-ink-3"
        >
          {resultat.melding}
        </p>
      )}
    </form>
  );
}
