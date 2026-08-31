"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { slettFremdriftAction } from "@/app/maal/actions";
import type { ActionResultat } from "@/lib/actions";

function Knapp() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-ink-3 underline decoration-edge underline-offset-2 transition-colors hover:text-ink disabled:opacity-50"
    >
      {pending ? "Sletter …" : "Slett"}
    </button>
  );
}

// Tekstlenke-variant av slett-knappen: loggradene er små, så en pill per
// innslag ville dominert listen. Samme confirm-vern som ellers.
export function SlettFremdriftKnapp({ id }: { id: string }) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    slettFremdriftAction,
    undefined,
  );

  return (
    <form
      action={handling}
      onSubmit={(hendelse) => {
        if (!window.confirm("Slette innslaget? Dette kan ikke angres.")) {
          hendelse.preventDefault();
        }
      }}
      className="flex shrink-0 items-center gap-2"
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
