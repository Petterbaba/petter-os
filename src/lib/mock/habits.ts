import type { Habit, HabitEntry, VaneData } from "@/lib/types";

export const vaner: Habit[] = [
  { id: "h1", name: "Trening" },
  { id: "h2", name: "Lesing" },
  { id: "h3", name: "Sideprosjekt" },
  { id: "h4", name: "Journaling" },
  { id: "h5", name: "10 000 skritt" },
  { id: "h6", name: "Investeringssjekk" },
];

// Deterministisk PRNG (mulberry32) med fast seed, så mock-dataen er identisk
// mellom renders og ikke gir hydration-avvik.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tilIsoDato(dato: Date): string {
  const aar = dato.getFullYear();
  const mnd = String(dato.getMonth() + 1).padStart(2, "0");
  const dag = String(dato.getDate()).padStart(2, "0");
  return `${aar}-${mnd}-${dag}`;
}

// Sannsynlighet per vane, justert for ukedag (0 = mandag … 6 = søndag)
// og fremgang over tid (t: 0 = periodens start, 1 = i dag).
function sannsynlighet(habitId: string, ukedag: number, t: number): number {
  const helg = ukedag >= 5;
  const trend = 0.75 + 0.35 * t; // bedre gjennomføring utover i perioden
  switch (habitId) {
    case "h1": return (helg ? 0.28 : 0.52) * trend; // Trening
    case "h2": return (helg ? 0.55 : 0.45) * trend; // Lesing
    case "h3": return (helg ? 0.48 : 0.28) * trend; // Sideprosjekt
    case "h4": return 0.68 * trend; // Journaling
    case "h5": return (helg ? 0.5 : 0.62) * trend; // 10 000 skritt
    case "h6": return ukedag === 0 ? 0.85 : 0.04; // Investeringssjekk (mandager)
    default: return 0;
  }
}

// 26 uker som slutter i inneværende uke: fra mandag 25 uker tilbake til i dag.
export function genererVaneData(): VaneData {
  const tilfeldig = mulberry32(42);
  const iDag = new Date();
  const ukedagIDag = (iDag.getDay() + 6) % 7; // 0 = mandag
  const fra = new Date(iDag);
  fra.setDate(iDag.getDate() - ukedagIDag - 25 * 7);

  const oppforinger: HabitEntry[] = [];
  const antallDager = 25 * 7 + ukedagIDag + 1;
  for (let i = 0; i < antallDager; i++) {
    const dato = new Date(fra);
    dato.setDate(fra.getDate() + i);
    const ukedag = (dato.getDay() + 6) % 7;
    const t = i / (antallDager - 1);
    const uke = Math.floor(i / 7);
    // Ferie (uke 8–9) og enkelte dårlige dager gir realistiske hull.
    const ferie = uke === 8 || uke === 9 ? 0.25 : 1;
    const daarligDag = tilfeldig() < 0.08 ? 0.15 : 1;
    for (const vane of vaner) {
      if (tilfeldig() < sannsynlighet(vane.id, ukedag, t) * ferie * daarligDag) {
        oppforinger.push({ habitId: vane.id, date: tilIsoDato(dato) });
      }
    }
  }
  return {
    vaner,
    oppforinger,
    periode: { fra: tilIsoDato(fra), til: tilIsoDato(iDag) },
  };
}
