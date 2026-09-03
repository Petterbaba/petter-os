"use client";

import { useActionState } from "react";
import {
  kobleFraOdaAction,
  kobleTilOdaAction,
  leggIOdaKurvAction,
} from "@/app/mat/actions";
import type { ActionResultat } from "@/lib/actions";

// Oda-kurven: «Koble til Oda» starter OAuth-flyten (én gang per
// nettleser), «Legg i Oda-kurven» sender ukens Oda-oppskrifter med
// porsjonstall til kurven via MCP. Betaling skjer hos Oda – lenken til
// kurven kommer tilbake i kvitteringen. Retter uten Oda-oppskrift
// listes så de kan legges inn for hånd.
export function OdaKort({
  mandag,
  koblet,
  antallMedOda,
  utenOda,
  statusMelding,
}: {
  mandag: string;
  koblet: boolean;
  antallMedOda: number;
  utenOda: string[];
  statusMelding: string | null;
}) {
  return (
    <section className="rounded-xl border border-edge bg-card px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Oda
        </h2>
        <p className="min-w-0 flex-1 text-xs text-ink-2">
          {koblet
            ? antallMedOda === 0
              ? "ingen av ukens retter har Oda-oppskrift"
              : `${antallMedOda} av ukens retter kan legges i kurven`
            : "ikke koblet til Oda-kontoen din"}
        </p>
        {koblet ? (
          <form action={kobleFraOdaAction}>
            <button
              type="submit"
              className="text-xs text-ink-3 underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
            >
              koble fra
            </button>
          </form>
        ) : (
          <form action={kobleTilOdaAction}>
            <button
              type="submit"
              className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
            >
              Koble til Oda
            </button>
          </form>
        )}
        {koblet && <KurvKnapp mandag={mandag} deaktivert={antallMedOda === 0} />}
      </div>
      {statusMelding && (
        <p role="status" className="mt-2 text-xs text-ink-3">
          {statusMelding}
        </p>
      )}
      {koblet && utenOda.length > 0 && (
        <p className="mt-2 text-xs text-ink-3">
          Uten Oda-oppskrift (legg varene inn selv): {utenOda.join(", ")}.
        </p>
      )}
    </section>
  );
}

function KurvKnapp({ mandag, deaktivert }: { mandag: string; deaktivert: boolean }) {
  const [resultat, handling, venter] = useActionState<
    ActionResultat | undefined,
    FormData
  >(leggIOdaKurvAction, undefined);

  return (
    <form action={handling} className="contents">
      <input type="hidden" name="mandag" value={mandag} />
      <button
        type="submit"
        disabled={venter || deaktivert}
        className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent disabled:opacity-50"
      >
        {venter ? "Legger i kurven …" : "Legg i Oda-kurven"}
      </button>
      {resultat && (
        <p
          role={resultat.ok ? "status" : "alert"}
          className="basis-full text-xs text-ink-2"
        >
          {resultat.melding}
          {resultat.ok && resultat.lenke && (
            <>
              {" "}
              <a
                href={resultat.lenke.href}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
              >
                {resultat.lenke.tekst}
              </a>
            </>
          )}
        </p>
      )}
    </form>
  );
}
