"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { slettOktAction } from "@/app/kokebok/actions";
import type { ActionResultat } from "@/lib/actions";

function Knapp({ beskrivelse }: { beskrivelse: string }) {
  const { pending } = useFormStatus();

  // aria-busy + onClick-vakt, ikke disabled (LagreKnappAnimert-regelen).
  return (
    <button
      type="submit"
      aria-busy={pending}
      aria-label={`Slett økten ${beskrivelse}`}
      onClick={(hendelse) => {
        if (pending) hendelse.preventDefault();
      }}
      className="text-xs text-ink-3 underline decoration-edge underline-offset-2 transition-colors hover:text-ink aria-busy:opacity-50"
    >
      {pending ? "Sletter …" : "Slett"}
    </button>
  );
}

// Sletter én lagret økt fra historikken (feilregistreringer, testøkter).
// Økter er loggrader, ikke katalog – de slettes. Native confirm() som
// angrevern (SlettJournalKnapp-mønsteret).
export function SlettOktKnapp({
  oktId,
  middagId,
  beskrivelse,
}: {
  oktId: string;
  middagId: string;
  beskrivelse: string; // «12. sep · 32 min» – til bekreftelsen og skjermleser
}) {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    slettOktAction,
    undefined,
  );

  return (
    <form
      action={handling}
      onSubmit={(hendelse) => {
        if (!window.confirm(`Slette økten ${beskrivelse}? Dette kan ikke angres.`)) {
          hendelse.preventDefault();
        }
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="okt" value={oktId} />
      <input type="hidden" name="middag" value={middagId} />
      {resultat && !resultat.ok && (
        <span role="alert" className="text-xs text-ink-3">
          {resultat.melding}
        </span>
      )}
      <Knapp beskrivelse={beskrivelse} />
    </form>
  );
}
