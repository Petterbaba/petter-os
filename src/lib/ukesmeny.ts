import type { Dinner } from "./types";
import { parseIsoDato } from "./dato";
import { ingrediensGram } from "./ernaering";

// Ren utvalgslogikk for «Lag ukesmeny» (maal.ts-/ernaering.ts-presedensen):
// ingen datatilgang, ingen tilfeldighet uten injisert kilde, så reglene
// kan testes og forklares. Reglene, i prioritert rekkefølge:
//   1. Ingen rett to ganger i samme uke.
//   2. Samme proteinkilde ikke to dager på rad (mildere: ikke to av tre).
//   3. Retter brukt de siste ukene nedprioriteres (14 dager hardt,
//      28 dager mildt).
//   4. Ellers tilfeldig – hvert trykk gir en ny meny.
// Proteinkilden avledes av ingrediensene (gram-vektet på navn), aldri
// lagret – ny rett i katalogen får kategori automatisk.

export type ProteinKategori = "kylling" | "fisk" | "storfe" | "svin" | "vegetar";

// Rekkefølgen betyr noe: første treff per ingrediens vinner, så
// «Kjøttdeig, kylling» blir kylling og «Kyllingkraft» teller som kylling.
const MONSTRE: [ProteinKategori, RegExp][] = [
  ["kylling", /kylling/i],
  ["fisk", /laks|fisk|torsk|sei\b|reke|salma|ørret|tunfisk|skrei|hyse/i],
  ["storfe", /storfe|kjøttdeig|biff|kjøttkake|kjøttboll|ytrefilet|entrec|okse|karbonade/i],
  ["svin", /svin|bacon|pølse|salsiccia|skinke|pulled|ribbe|medister/i],
];

export function proteinKategori(middag: Dinner): ProteinKategori {
  const gram = new Map<ProteinKategori, number>();
  for (const rad of middag.ingredients) {
    const tekst = `${rad.label} ${rad.foodItem?.name ?? ""}`;
    const treff = MONSTRE.find(([, monster]) => monster.test(tekst));
    if (treff === undefined) {
      continue;
    }
    // Uomregnbar mengde («etter smak» o.l.) teller lite, men ikke null.
    gram.set(treff[0], (gram.get(treff[0]) ?? 0) + (ingrediensGram(rad) ?? 25));
  }
  let beste: ProteinKategori = "vegetar";
  let maks = 0;
  for (const [kategori, sum] of gram) {
    if (sum > maks) {
      maks = sum;
      beste = kategori;
    }
  }
  return beste;
}

export type UkeDagValg = {
  dato: string;
  middag: Dinner | null; // null = skal fylles
};

function dagerMellom(fra: string, til: string): number {
  return Math.round(
    (parseIsoDato(til).getTime() - parseIsoDato(fra).getTime()) / 86_400_000,
  );
}

export function lagUkesmeny({
  uke,
  kandidater,
  sisteBrukt,
  tilfeldig = Math.random,
}: {
  uke: UkeDagValg[]; // hele uken i datorekkefølge; låste dager har middag
  kandidater: Dinner[]; // retter som kan velges (ikke alt i uken fra før)
  sisteBrukt: Map<string, string>; // dinnerId → siste planlagte dato før uken
  tilfeldig?: () => number; // 0–1; injiserbar for tester
}): { plannedOn: string; dinnerId: string }[] {
  const valgt: { plannedOn: string; dinnerId: string }[] = [];
  const kategoriPerDag = new Map<string, ProteinKategori>();
  for (const dag of uke) {
    if (dag.middag !== null) {
      kategoriPerDag.set(dag.dato, proteinKategori(dag.middag));
    }
  }
  const kategoriPerId = new Map(
    kandidater.map((middag) => [middag.id, proteinKategori(middag)]),
  );
  const pool = [...kandidater];

  for (let i = 0; i < uke.length && pool.length > 0; i++) {
    const dag = uke[i];
    if (dag.middag !== null) {
      continue;
    }
    // Naboene som alt er bestemt: dagen før (og to før) og dagen etter
    // når den er låst fra før – så en manuelt valgt laks på onsdag
    // ikke får laks foreslått tirsdag.
    const naboer: [string | undefined, number][] = [
      [uke[i - 1]?.dato, 1],
      [uke[i - 2]?.dato, 0.4],
      [uke[i + 1]?.dato, 1],
      [uke[i + 2]?.dato, 0.4],
    ];

    let beste = pool[0];
    let besteScore = -Infinity;
    for (const kandidat of pool) {
      const kategori = kategoriPerId.get(kandidat.id)!;
      let score = tilfeldig();
      for (const [naboDato, straff] of naboer) {
        if (naboDato !== undefined && kategoriPerDag.get(naboDato) === kategori) {
          score -= straff;
        }
      }
      const brukt = sisteBrukt.get(kandidat.id);
      if (brukt !== undefined) {
        const dager = dagerMellom(brukt, dag.dato);
        if (dager < 14) {
          score -= 1.5;
        } else if (dager < 28) {
          score -= 0.8;
        }
      }
      if (score > besteScore) {
        besteScore = score;
        beste = kandidat;
      }
    }

    valgt.push({ plannedOn: dag.dato, dinnerId: beste.id });
    kategoriPerDag.set(dag.dato, kategoriPerId.get(beste.id)!);
    pool.splice(pool.indexOf(beste), 1);
  }

  return valgt;
}
