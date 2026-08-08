import type { Habit, HabitEntry } from "./types";

export type VaneStatus = Habit & { antall: number };

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

// Gjennomføring per vane de siste 30 dagene av perioden – delt mellom
// heatmap-listen og radargrafen så de alltid viser samme tall.
export function vaneStatusSiste30(
  vaner: Habit[],
  oppforinger: HabitEntry[],
  periode: { fra: string; til: string },
): { perVane: VaneStatus[]; antallDager: number } {
  const til = parseIsoDato(periode.til);
  const grense = new Date(til);
  grense.setDate(til.getDate() - 29);
  const fra = parseIsoDato(periode.fra);
  const start = grense > fra ? grense : fra;
  const grenseIso = tilIsoDato(start);
  const antallDager =
    Math.round((til.getTime() - start.getTime()) / 86_400_000) + 1;

  const perVane = vaner.map((vane) => ({
    ...vane,
    antall: oppforinger.filter(
      (o) => o.habitId === vane.id && o.date >= grenseIso,
    ).length,
  }));

  return { perVane, antallDager };
}
