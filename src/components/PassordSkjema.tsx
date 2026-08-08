"use client";

import { useActionState } from "react";
import { byttPassord } from "@/app/innstillinger/actions";
import type { ActionResultat } from "@/lib/actions";
import { SkjemaFelt } from "./skjema/SkjemaFelt";
import { LagreKnapp } from "./skjema/LagreKnapp";

export function PassordSkjema() {
  const [resultat, handling] = useActionState<ActionResultat | undefined, FormData>(
    byttPassord,
    undefined,
  );

  return (
    <form
      action={handling}
      className="mb-4 rounded-xl border border-edge bg-card p-4 sm:p-5"
    >
      <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-ink-3">
        Bytt passord
      </h2>
      <div className="flex max-w-xs flex-col gap-3">
        <SkjemaFelt
          etikett="Dagens passord"
          name="naavaerende"
          type="password"
          autoComplete="current-password"
          required
        />
        <SkjemaFelt
          etikett="Nytt passord (minst 8 tegn)"
          name="nytt"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <SkjemaFelt
          etikett="Gjenta nytt passord"
          name="gjenta"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <div>
          <LagreKnapp>Bytt passord</LagreKnapp>
        </div>
      </div>
      {resultat && (
        <p role={resultat.ok ? "status" : "alert"} className="mt-3 text-sm text-ink-2">
          {resultat.melding}
        </p>
      )}
    </form>
  );
}
