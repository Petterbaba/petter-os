import type { Habit, HabitEntry } from "@/lib/types";
import { formatDato } from "@/lib/format";
import { dagerIPeriode } from "@/lib/dato";
import { vaneStatusSiste30 } from "@/lib/vaner";
import { DashboardCard } from "./DashboardCard";
import { HeatmapRutenett } from "./HeatmapRutenett";

type VaneModulProps = {
  vaner: Habit[];
  oppforinger: HabitEntry[];
  periode: { fra: string; til: string };
};

// 0 mål → tom; ellers fire trinn etter andel av alle vanene
// (med 6 vaner: 1–2 → 1, 3–4 → 2, 5 → 3, 6 → 4).
function nivaa(antall: number, totalt: number): number {
  if (antall === 0) return 0;
  const andel = antall / totalt;
  if (andel <= 0.34) return 1;
  if (andel <= 0.67) return 2;
  if (andel < 1) return 3;
  return 4;
}

export function VaneModul({ vaner, oppforinger, periode }: VaneModulProps) {
  const antallPerDag = new Map<string, number>();
  for (const oppforing of oppforinger) {
    antallPerDag.set(oppforing.date, (antallPerDag.get(oppforing.date) ?? 0) + 1);
  }

  const iDagAntall = antallPerDag.get(periode.til) ?? 0;

  // Dager på rad (bakover fra i dag) med minst ett gjennomført mål.
  const dager = dagerIPeriode(periode.fra, periode.til);
  let rekke = 0;
  for (let i = dager.length - 1; i >= 0; i--) {
    if ((antallPerDag.get(dager[i]) ?? 0) === 0) break;
    rekke++;
  }

  const { perVane, antallDager: sisteTretti } = vaneStatusSiste30(
    vaner,
    oppforinger,
    periode,
  );

  return (
    <DashboardCard
      tittel="Vaner"
      hovedtall={`${iDagAntall} av ${vaner.length} i dag`}
      undertekst={`${rekke} ${rekke === 1 ? "dag" : "dager"} på rad med minst ett mål`}
    >
      <HeatmapRutenett
        fra={periode.fra}
        til={periode.til}
        nivaaForDag={(dato) => nivaa(antallPerDag.get(dato) ?? 0, vaner.length)}
        tittelForDag={(dato) =>
          `${antallPerDag.get(dato) ?? 0} av ${vaner.length} mål · ${formatDato(dato)}`
        }
        visSkala
      />
      <ul className="mt-4 space-y-2">
        {perVane.map((vane) => (
          <li
            key={vane.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-ink-2">{vane.name}</span>
            <span className="flex items-center gap-2">
              <span className="h-1 w-20 overflow-hidden rounded-full bg-heat-0">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${(vane.antall / sisteTretti) * 100}%` }}
                />
              </span>
              <span className="w-16 text-right tabular-nums text-ink">
                {vane.antall} av {sisteTretti}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
