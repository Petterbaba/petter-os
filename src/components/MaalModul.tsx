import type { Goal } from "@/lib/types";
import { formatTall } from "@/lib/format";
import { erFullfort, erIRute, fremdriftsandel, misogiForAar } from "@/lib/maal";
import { DashboardCard } from "./DashboardCard";
import { FremdriftsBar } from "./FremdriftsBar";
import { UtfallsBadge } from "./UtfallsBadge";

// Kompakt samlevisning for dashbordet – mål-siden bruker MaalUtforsker
// (misogi-kort + full liste med redigering).
type MaalModulProps = {
  maal: Goal[];
  iDag: string;
};

const MAKS_VISTE = 3;

export function MaalModul({ maal, iDag }: MaalModulProps) {
  const aarets = misogiForAar(maal, Number(iDag.slice(0, 4)));
  const aktive = maal.filter(
    (punkt) =>
      punkt.kind === "maal" &&
      !erFullfort(punkt) &&
      (punkt.dueOn === null || punkt.dueOn >= iDag),
  );

  if (maal.length === 0) {
    return (
      <DashboardCard tittel="Mål">
        <p className="text-sm text-ink-3">Ingen mål ennå.</p>
      </DashboardCard>
    );
  }

  const medPacing = aktive.filter((punkt) => erIRute(punkt, iDag) !== null);
  const iRute = medPacing.filter((punkt) => erIRute(punkt, iDag) === true);

  return (
    <DashboardCard
      tittel="Mål"
      hovedtall={
        medPacing.length > 0
          ? `${iRute.length} av ${medPacing.length} i rute`
          : undefined
      }
    >
      {aarets && (
        <div className="mb-4 flex items-baseline gap-2">
          <span className="shrink-0 text-xs text-ink-3">
            Misogi {aarets.misogiYear}
          </span>
          <span className="min-w-0 flex-1 break-words text-sm font-medium text-ink">
            {aarets.title}
          </span>
          <UtfallsBadge utfall={aarets.outcome} />
        </div>
      )}
      {aktive.length === 0 ? (
        <p className="text-sm text-ink-3">Ingen aktive fremdriftsmål.</p>
      ) : (
        <ul className="space-y-2">
          {aktive.slice(0, MAKS_VISTE).map((punkt) => (
            <li
              key={punkt.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0 flex-1 break-words text-ink-2">
                {punkt.title}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <FremdriftsBar andel={fremdriftsandel(punkt)} />
                <span className="w-24 text-right text-xs tabular-nums text-ink">
                  {punkt.progressValue !== null && punkt.targetValue !== null
                    ? `${formatTall(punkt.progressValue)} av ${formatTall(punkt.targetValue)}`
                    : "–"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
