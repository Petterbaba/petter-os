import type { Goal } from "./types";
import { parseIsoDato } from "./dato";

// Ren fremdriftsmatematikk for mål (presedens: src/lib/vaner.ts) – delt
// mellom /maal-siden og dashbord-kortet så de alltid viser samme tall.
// Alle funksjonene svarer null når noe ikke kan beregnes (misogi, manglende
// baseline, tom periode) – UI-et viser da «–» i stedet for NaN.

const DOGN_MS = 86_400_000;

function klem01(andel: number): number {
  return Math.min(1, Math.max(0, andel));
}

// Andel av målet som er nådd (0–1, klemt).
// Manuell/telle: fremdrift / målverdi. Metrikk: avstanden fra utgangs-
// målingen mot målverdien («ned»: baseline − nåverdi over baseline − mål).
export function fremdriftsandel(maal: Goal): number | null {
  if (
    maal.kind !== "maal" ||
    maal.targetValue === null ||
    maal.progressValue === null
  ) {
    return null;
  }

  if (maal.metricKey !== null) {
    if (maal.baselineValue === null || maal.direction === null) {
      return null;
    }
    const total =
      maal.direction === "ned"
        ? maal.baselineValue - maal.targetValue
        : maal.targetValue - maal.baselineValue;
    if (total <= 0) {
      // Utgangsmålingen var allerede forbi målet – andel gir ikke mening.
      return null;
    }
    const oppnaadd =
      maal.direction === "ned"
        ? maal.baselineValue - maal.progressValue
        : maal.progressValue - maal.baselineValue;
    return klem01(oppnaadd / total);
  }

  if (maal.targetValue <= 0) {
    return null;
  }
  return klem01(maal.progressValue / maal.targetValue);
}

// Fullført sjekkes direkte mot målverdien (uavhengig av baseline, så et
// metrikk-mål uten utgangsmåling likevel kan fullføres).
export function erFullfort(maal: Goal): boolean {
  if (
    maal.kind !== "maal" ||
    maal.targetValue === null ||
    maal.progressValue === null
  ) {
    return false;
  }
  if (maal.metricKey !== null) {
    return maal.direction === "ned"
      ? maal.progressValue <= maal.targetValue
      : maal.progressValue >= maal.targetValue;
  }
  return maal.progressValue >= maal.targetValue;
}

// Hele dager til fristen (negativt = utløpt). null uten frist.
export function dagerIgjen(maal: Goal, iDag: string): number | null {
  if (maal.dueOn === null) {
    return null;
  }
  return Math.round(
    (parseIsoDato(maal.dueOn).getTime() - parseIsoDato(iDag).getTime()) /
      DOGN_MS,
  );
}

// Andel av perioden som har gått (0–1) – pacingen som gjør at et årsmål
// («80 000 kr i år») viser kvartalsrytmen implisitt.
export function forventetAndel(maal: Goal, iDag: string): number | null {
  if (maal.startsOn === null || maal.dueOn === null) {
    return null;
  }
  const start = parseIsoDato(maal.startsOn).getTime();
  const slutt = parseIsoDato(maal.dueOn).getTime();
  if (slutt <= start) {
    return null;
  }
  return klem01((parseIsoDato(iDag).getTime() - start) / (slutt - start));
}

// Ligger målet an til å nås? null når pacing ikke kan beregnes.
export function erIRute(maal: Goal, iDag: string): boolean | null {
  const andel = fremdriftsandel(maal);
  const forventet = forventetAndel(maal, iDag);
  if (andel === null || forventet === null) {
    return null;
  }
  return andel >= forventet;
}

export function misogiForAar(maal: Goal[], aar: number): Goal | undefined {
  return maal.find(
    (kandidat) => kandidat.kind === "misogi" && kandidat.misogiYear === aar,
  );
}
