"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { arkiverMiddagAction } from "@/app/mat/actions";
import type { ActionResultat } from "@/lib/actions";

function Knapp() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink-3 transition-colors hover:border-accent hover:text-ink disabled:opacity-50"
    >
      {pending ? "Arkiverer …" : "Arkiver"}
    </button>
  );
}

// Egen liten form per middag (slett-knapp-mønsteret) – men katalogregelen
// gjelder: middager arkiveres, slettes aldri, så historikken består.
export function ArkiverMiddagKnapp({ id }: { id: string }) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    arkiverMiddagAction,
    undefined,
  );

  return (
    <form
      action={handling}
      onSubmit={(hendelse) => {
        if (
          !window.confirm(
            "Arkivere middagen? Den forsvinner fra katalogen og ukesplan-valgene, men gamle planer består.",
          )
        ) {
          hendelse.preventDefault();
        }
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      {resultat && !resultat.ok && (
        <span role="alert" className="text-xs text-ink-3">
          {resultat.melding}
        </span>
      )}
      <Knapp />
    </form>
  );
}
