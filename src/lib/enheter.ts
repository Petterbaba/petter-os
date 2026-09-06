import type { FoodPortion } from "./types";

// Ren enhetsmatematikk for ingrediensmengder (maal.ts-/ernaering.ts-
// presedensen): gram er basisenheten – næringsberegningen skjer alltid i
// gram – og alle andre enheter regnes om via matvarens porsjonsvekter fra
// Matvaretabellen. Omregningen AVLEDES her og lagres aldri; finnes ingen
// porsjonsvekt, svares null og raden teller ikke i næringsberegningen
// (dekningen «X av Y ingredienser» viser det i UI).

export const ENHETER = ["g", "kg", "ml", "dl", "l", "ss", "ts", "stk"] as const;

export type Enhet = (typeof ENHETER)[number];

export function erEnhet(verdi: string): verdi is Enhet {
  return (ENHETER as readonly string[]).includes(verdi);
}

// Volumenhetene i ml – lar en matvare med ÉN volumporsjonsvekt (tetthet)
// dekke alle volumenheter: har melk «desiliter» = 103 g, blir 1 ss
// 103/100 × 15 g.
const VOLUM_ML: Partial<Record<Enhet, number>> = {
  ml: 1,
  dl: 100,
  l: 1000,
  ss: 15,
  ts: 5,
};

// Matvaretabellens porsjonsnavn per enhet (kilden bruker fulle norske ord).
const PORSJONSNAVN: Partial<Record<Enhet, string>> = {
  dl: "desiliter",
  ss: "spiseskje",
  ts: "teskje",
};

function porsjonsGram(
  porsjoner: readonly FoodPortion[],
  navn: string,
): number | null {
  const treff = porsjoner.find((porsjon) => porsjon.name === navn);
  return treff === undefined || treff.grams <= 0 ? null : treff.grams;
}

// Gram per 1 enhet for en matvare; null når omregningen ikke finnes.
// Egen porsjonsvekt foretrekkes (en «spiseskje» mel er toppet, ikke
// strøken); ellers avledes volum av en annen volumporsjon via tetthet.
// stk krever egen porsjonsvekt («stk», ev. «stk (middels)»).
export function gramPerEnhet(
  enhet: Enhet,
  porsjoner: readonly FoodPortion[] | null,
): number | null {
  if (enhet === "g") {
    return 1;
  }
  if (enhet === "kg") {
    return 1000;
  }
  if (porsjoner === null) {
    return null;
  }

  if (enhet === "stk") {
    return (
      porsjonsGram(porsjoner, "stk") ?? porsjonsGram(porsjoner, "stk (middels)")
    );
  }

  const eget = PORSJONSNAVN[enhet];
  if (eget !== undefined) {
    const gram = porsjonsGram(porsjoner, eget);
    if (gram !== null) {
      return gram;
    }
  }
  const ml = VOLUM_ML[enhet];
  if (ml === undefined) {
    return null;
  }
  for (const annen of ENHETER) {
    const navn = PORSJONSNAVN[annen];
    if (navn === undefined || annen === enhet) {
      continue;
    }
    const gram = porsjonsGram(porsjoner, navn);
    if (gram !== null) {
      return (gram / VOLUM_ML[annen]!) * ml;
    }
  }
  return null;
}

// Mengden i gram – tallet nærings- og proteinberegningene bruker.
// null = «etter smak» eller uomregnbar enhet.
export function tilGram(
  mengde: number | null,
  enhet: Enhet,
  porsjoner: readonly FoodPortion[] | null,
): number | null {
  if (mengde === null) {
    return null;
  }
  const perEnhet = gramPerEnhet(enhet, porsjoner);
  return perEnhet === null ? null : mengde * perEnhet;
}
