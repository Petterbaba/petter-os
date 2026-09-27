"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { arkiverOppskriftAction } from "@/app/kokebok/actions";
import type { ActionResultat } from "@/lib/actions";

function Knapp() {
  const { pending } = useFormStatus();

  // aria-busy + onClick-vakt, ikke disabled (LagreKnappAnimert-regelen:
  // disabled flytter tastaturfokus til body).
  return (
    <button
      type="submit"
      aria-busy={pending}
      onClick={(hendelse) => {
        if (pending) hendelse.preventDefault();
      }}
      className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink-3 transition-colors hover:border-accent hover:text-ink aria-busy:opacity-50"
    >
      {pending ? "Arkiverer …" : "Arkiver oppskrift"}
    </button>
  );
}

// Katalogregelen: oppskrifter arkiveres, slettes aldri. Egen liten form
// (kan ikke nestes i editoren) med native confirm() som angrevern –
// SlettJournalKnapp-mønsteret.
export function ArkiverOppskriftKnapp({ id }: { id: string }) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    arkiverOppskriftAction,
    undefined,
  );

  return (
    <form
      action={handling}
      onSubmit={(hendelse) => {
        if (
          !window.confirm(
            "Arkivere oppskriften? Den forsvinner fra kokeboken og katalogen på /mat, og dager i ukesplanen med den blir tomme. Ingenting slettes.",
          )
        ) {
          hendelse.preventDefault();
        }
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <input type="hidden" name="id" value={id} />
      <Knapp />
      <span className="text-xs text-ink-3">
        Oppskrifter arkiveres, slettes aldri.
      </span>
      {resultat && !resultat.ok && (
        <span role="alert" className="text-xs text-ink-3">
          {resultat.melding}
        </span>
      )}
    </form>
  );
}
