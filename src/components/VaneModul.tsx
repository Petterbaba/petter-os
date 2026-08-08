import type { Habit, HabitEntry } from "@/lib/types";
import { formatDato } from "@/lib/format";
import { vaneStatusSiste30 } from "@/lib/vaner";
import { DashboardCard } from "./DashboardCard";

type VaneModulProps = {
  vaner: Habit[];
  oppforinger: HabitEntry[];
  periode: { fra: string; til: string };
};

const CELLE_PX = 12;
const GAP_PX = 3;

// Tailwind trenger klassenavnene fullt utskrevet for å generere dem.
const nivaaKlasser = [
  "bg-heat-0",
  "bg-heat-1",
  "bg-heat-2",
  "bg-heat-3",
  "bg-heat-4",
];

function parseIsoDato(iso: string): Date {
  const [aar, mnd, dag] = iso.split("-").map(Number);
  return new Date(aar, mnd - 1, dag);
}

function tilIsoDato(dato: Date): string {
  const aar = dato.getFullYear();
  const mnd = String(dato.getMonth() + 1).padStart(2, "0");
  const dag = String(dato.getDate()).padStart(2, "0");
  return `${aar}-${mnd}-${dag}`;
}

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

const mndFormat = new Intl.DateTimeFormat("nb-NO", { month: "short" });

export function VaneModul({ vaner, oppforinger, periode }: VaneModulProps) {
  const antallPerDag = new Map<string, number>();
  for (const oppforing of oppforinger) {
    antallPerDag.set(oppforing.date, (antallPerDag.get(oppforing.date) ?? 0) + 1);
  }

  // Alle dager i perioden, gruppert i uker (kolonner) fra mandag.
  const fra = parseIsoDato(periode.fra);
  const til = parseIsoDato(periode.til);
  const dager: string[] = [];
  for (const d = new Date(fra); d <= til; d.setDate(d.getDate() + 1)) {
    dager.push(tilIsoDato(d));
  }
  const uker: string[][] = [];
  for (let i = 0; i < dager.length; i += 7) {
    uker.push(dager.slice(i, i + 7));
  }

  // Månedsetikett på ukene der en ny måned begynner.
  const mndEtiketter = uker.map((uke, i) => {
    const mandag = parseIsoDato(uke[0]);
    if (i === 0) return null; // kan stå midt i en måned – dropp etiketten
    const forrigeMandag = parseIsoDato(uker[i - 1][0]);
    return mandag.getMonth() !== forrigeMandag.getMonth()
      ? mndFormat.format(mandag).replace(".", "")
      : null;
  });

  const iDagAntall = antallPerDag.get(periode.til) ?? 0;

  // Dager på rad (bakover fra i dag) med minst ett gjennomført mål.
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
      <div className="overflow-x-auto pb-1">
        <div className="w-max">
          <div
            className="relative mb-1 h-4 text-[10px] text-ink-3"
            style={{ marginLeft: 26 }}
          >
            {mndEtiketter.map(
              (etikett, i) =>
                etikett && (
                  <span
                    key={i}
                    className="absolute"
                    style={{ left: i * (CELLE_PX + GAP_PX) }}
                  >
                    {etikett}
                  </span>
                ),
            )}
          </div>
          <div className="flex" style={{ gap: GAP_PX }}>
            <div
              className="grid w-[23px] pr-1 text-right text-[10px] text-ink-3"
              style={{ gridTemplateRows: `repeat(7, ${CELLE_PX}px)`, gap: GAP_PX }}
            >
              <span className="leading-[12px]">man</span>
              <span />
              <span className="leading-[12px]">ons</span>
              <span />
              <span className="leading-[12px]">fre</span>
            </div>
            {uker.map((uke, ukeIndeks) => (
              <div
                key={ukeIndeks}
                className="grid"
                style={{ gridTemplateRows: `repeat(7, ${CELLE_PX}px)`, gap: GAP_PX }}
              >
                {uke.map((dato) => {
                  const antall = antallPerDag.get(dato) ?? 0;
                  return (
                    <span
                      key={dato}
                      title={`${antall} av ${vaner.length} mål · ${formatDato(dato)}`}
                      className={`rounded-[3px] ${nivaaKlasser[nivaa(antall, vaner.length)]}`}
                      style={{ width: CELLE_PX, height: CELLE_PX }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-ink-3">
            <span className="mr-1">Mindre</span>
            {nivaaKlasser.map((klasse) => (
              <span
                key={klasse}
                className={`rounded-[3px] ${klasse}`}
                style={{ width: CELLE_PX, height: CELLE_PX }}
              />
            ))}
            <span className="ml-1">Mer</span>
          </div>
        </div>
      </div>
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
