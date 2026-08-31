"use client";

import type { Goal } from "@/lib/types";
import { formatDato } from "@/lib/format";
import { UtfallsBadge } from "./UtfallsBadge";

// Hero-kortet for årets misogi – ett årsdefinerende mål (Marcus Elliott /
// Michael Easter): ~50 % sjanse for å mislykkes, og du kan ikke dø. Ingen
// tallfremdrift; utfallet (planlagt/forsøkt/fullført) og refleksjonen er
// historien. Tidligere år vises som kompakt historikk nederst.
export function MisogiKort({
  misogier,
  aar,
  onNy,
  onRediger,
  onUtfall,
}: {
  misogier: Goal[];
  aar: number;
  onNy: () => void;
  onRediger: (misogi: Goal) => void;
  onUtfall: (misogi: Goal) => void;
}) {
  const aarets = misogier.find((misogi) => misogi.misogiYear === aar);
  const tidligere = misogier
    .filter((misogi) => misogi.misogiYear !== aar)
    .sort((a, b) => (b.misogiYear ?? 0) - (a.misogiYear ?? 0));

  return (
    <section className="rounded-xl border border-edge bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Misogi {aar}
        </h2>
        {aarets && (
          <div className="flex flex-wrap items-baseline justify-end gap-2">
            <button
              type="button"
              onClick={() => onUtfall(aarets)}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
            >
              {aarets.outcome === "planlagt" ? "Hvordan gikk det?" : "Endre utfall"}
            </button>
            <button
              type="button"
              onClick={() => onRediger(aarets)}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
            >
              Rediger
            </button>
            <button
              type="button"
              onClick={onNy}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
            >
              Ny misogi
            </button>
          </div>
        )}
      </div>

      {aarets ? (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="min-w-0 break-words text-2xl font-semibold text-ink sm:text-3xl">
              {aarets.title}
            </p>
            <UtfallsBadge utfall={aarets.outcome} />
          </div>
          {aarets.motivation && (
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">
              {aarets.motivation}
            </p>
          )}
          {aarets.dueOn && aarets.outcome === "planlagt" && (
            <p className="mt-2 text-xs text-ink-3">
              Forsøket er planlagt {formatDato(aarets.dueOn)}
            </p>
          )}
          {aarets.reflection && (
            <div className="mt-3 border-t border-edge pt-3">
              <h3 className="text-xs text-ink-3">Refleksjon</h3>
              <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">
                {aarets.reflection}
              </p>
            </div>
          )}
        </>
      ) : (
        <div>
          <p className="text-sm leading-relaxed text-ink-2">
            Én utfordring så stor at den definerer året. To regler: ~50 %
            sjanse for å mislykkes – og du kan ikke dø. Et ærlig forsøk teller
            like mye som å lykkes.
          </p>
          <p className="mt-2 text-xs text-ink-3">
            F.eks.: svøm over Drøbaksundet med følgebåt, Birkebeinerrennet
            under merketiden, maraton under 4 timer.
          </p>
          <button
            type="button"
            onClick={onNy}
            className="mt-3 rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
          >
            Sett årets misogi
          </button>
        </div>
      )}

      {tidligere.length > 0 && (
        <div className="mt-4 border-t border-edge pt-3">
          <h3 className="text-xs text-ink-3">Tidligere år</h3>
          <ul className="mt-2 space-y-1.5">
            {tidligere.map((misogi) => (
              <li
                key={misogi.id}
                className="flex items-baseline gap-3 text-sm"
              >
                <span className="shrink-0 tabular-nums text-ink-3">
                  {misogi.misogiYear}
                </span>
                <span className="min-w-0 flex-1 break-words text-ink-2">
                  {misogi.title}
                </span>
                <UtfallsBadge utfall={misogi.outcome} />
                <button
                  type="button"
                  onClick={() => onUtfall(misogi)}
                  className="shrink-0 text-xs text-ink-3 underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
                >
                  Utfall
                </button>
                <button
                  type="button"
                  onClick={() => onRediger(misogi)}
                  className="shrink-0 text-xs text-ink-3 underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
                >
                  Rediger
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
