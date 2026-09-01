import type { Dinner, DinnerIngredient, DinnerPlan } from "./types";

// Ren næringsmatematikk for mat-domenet (maal.ts-presedensen) – delt mellom
// /mat-siden og ev. dashbordkort så de alltid viser samme tall. Næring
// lagres ALDRI (veikartets daily_nutrition-prinsipp) – alt beregnes her fra
// gram × matvarens verdier per 100 g. Funksjonene svarer null når noe ikke
// kan beregnes – UI-et viser da «–» i stedet for NaN.

export type Naering = {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
};

// Hvor mye av oppskriften tallene dekker: en ingrediens teller kun når den
// er mappet mot en matvare OG har grammengde. UI-et kan vise «basert på
// 7 av 9 ingredienser» når dekningen ikke er full.
export type NaeringsDekning = {
  talte: number;
  totalt: number;
};

function erTellende(ingrediens: DinnerIngredient): boolean {
  return ingrediens.foodItem !== null && ingrediens.amountGrams !== null;
}

export function naeringsDekning(middag: Dinner): NaeringsDekning {
  return {
    talte: middag.ingredients.filter(erTellende).length,
    totalt: middag.ingredients.length,
  };
}

// Næring for HELE oppskriften (alle porsjoner). null når ingen ingrediens
// kan telles. Manglende makroverdi hos en matvare (sjeldent i kilden)
// regnes som 0; kcal er alltid satt for matvarer i katalogen.
export function naeringForMiddag(middag: Dinner): Naering | null {
  let noenTalte = false;
  const sum: Naering = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, fiberG: 0 };

  for (const rad of middag.ingredients) {
    if (rad.foodItem === null || rad.amountGrams === null) {
      continue;
    }
    noenTalte = true;
    const andel = rad.amountGrams / 100;
    sum.kcal += andel * rad.foodItem.kcalPer100g;
    sum.proteinG += andel * (rad.foodItem.proteinPer100g ?? 0);
    sum.fatG += andel * (rad.foodItem.fatPer100g ?? 0);
    sum.carbsG += andel * (rad.foodItem.carbsPer100g ?? 0);
    sum.fiberG += andel * (rad.foodItem.fiberPer100g ?? 0);
  }

  return noenTalte ? sum : null;
}

// Næring per porsjon – tallet katalogen og ukesplanen viser.
export function naeringPerPorsjon(middag: Dinner): Naering | null {
  const total = naeringForMiddag(middag);
  if (total === null || middag.servings <= 0) {
    return null;
  }
  return {
    kcal: total.kcal / middag.servings,
    proteinG: total.proteinG / middag.servings,
    fatG: total.fatG / middag.servings,
    carbsG: total.carbsG / middag.servings,
    fiberG: total.fiberG / middag.servings,
  };
}

export type HandlelisteLinje = {
  label: string; // matvarenavnet når mappet, ellers oppskriftens eget navn
  grams: number | null; // sum av angitte mengder; null når ingen er angitt
  antallRetter: number; // hvor mange planlagte middager linjen inngår i
};

// Aggregert handleliste for de planlagte middagene: like ingredienser slås
// sammen – mappet matvare er samme vare på tvers av oppskrifter, umappede
// grupperes på normalisert label. Planer uten kjent middag (f.eks. arkivert
// etter planlegging) hoppes stille over.
export function aggregerHandleliste(
  planer: DinnerPlan[],
  middager: Dinner[],
): HandlelisteLinje[] {
  const middagPerId = new Map(middager.map((middag) => [middag.id, middag]));
  const linjer = new Map<string, HandlelisteLinje>();

  for (const plan of planer) {
    const middag = middagPerId.get(plan.dinnerId);
    if (middag === undefined) {
      continue;
    }
    // Samme vare kan stå flere ganger i én oppskrift; retten telles én gang.
    const talteIDennePlanen = new Set<string>();
    for (const rad of middag.ingredients) {
      const nokkel =
        rad.foodItem?.id ?? `label:${rad.label.trim().toLowerCase()}`;
      const linje = linjer.get(nokkel) ?? {
        label: rad.foodItem?.name ?? rad.label,
        grams: null,
        antallRetter: 0,
      };
      if (rad.amountGrams !== null) {
        linje.grams = (linje.grams ?? 0) + rad.amountGrams;
      }
      if (!talteIDennePlanen.has(nokkel)) {
        linje.antallRetter += 1;
        talteIDennePlanen.add(nokkel);
      }
      linjer.set(nokkel, linje);
    }
  }

  return [...linjer.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "nb"),
  );
}
