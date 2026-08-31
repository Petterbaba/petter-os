"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { slettMaalAction } from "@/app/maal/actions";
import type { ActionResultat } from "@/lib/actions";

function Knapp() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink-3 transition-colors hover:border-accent hover:text-ink disabled:opacity-50"
    >
      {pending ? "Sletter …" : "Slett"}
    </button>
  );
}

// Egen liten form per mål: native confirm() som angrevern før den
// endelige slettingen (samme mønster som journalen/reisene).
export function SlettMaalKnapp({ id }: { id: string }) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    slettMaalAction,
    undefined,
  );

  return (
    <form
      action={handling}
      onSubmit={(hendelse) => {
        if (
          !window.confirm(
            "Slette målet og all logget fremdrift? Dette kan ikke angres.",
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
