import type { Dinner, DinnerIngredient, DinnerPlan } from "./types";
import { tilGram, type Enhet, ENHETER } from "./enheter";

// Ren næringsmatematikk for mat-domenet (maal.ts-presedensen) – delt mellom
// /mat-siden og ev. dashbordkort så de alltid viser samme tall. Næring
// lagres ALDRI (veikartets daily_nutrition-prinsipp) – alt beregnes her fra
// gram × matvarens verdier per 100 g; mengder i andre enheter regnes om
// via enheter.ts. Funksjonene svarer null når noe ikke kan beregnes –
// UI-et viser da «–» i stedet for NaN.

export type Naering = {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
};

// Mengden i gram for en ingrediensrad – null når mengden mangler («etter
// smak») eller enheten ikke kan regnes om for matvaren (mangler
// porsjonsvekt). Delt med ukesmeny-proteinvektingen så alle gram-tall
// avledes ett sted.
export function ingrediensGram(ingrediens: DinnerIngredient): number | null {
  return tilGram(
    ingrediens.amount,
    ingrediens.unit,
    ingrediens.foodItem?.portions ?? null,
  );
}

// Hvor mye av oppskriften tallene dekker: en ingrediens teller kun når den
// er mappet mot en matvare OG mengden kan regnes om til gram. UI-et kan
// vise «basert på 7 av 9 ingredienser» når dekningen ikke er full.
export type NaeringsDekning = {
  talte: number;
  totalt: number;
};

function erTellende(ingrediens: DinnerIngredient): boolean {
  return ingrediens.foodItem !== null && ingrediensGram(ingrediens) !== null;
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
    const gram = ingrediensGram(rad);
    if (rad.foodItem === null || gram === null) {
      continue;
    }
    noenTalte = true;
    const andel = gram / 100;
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
  mengder: { enhet: Enhet; sum: number }[]; // per angitt enhet; tom = kun «etter smak»
  antallRetter: number; // hvor mange planlagte middager linjen inngår i
};

// Aggregert handleliste for de planlagte middagene: like ingredienser slås
// sammen – mappet matvare er samme vare på tvers av oppskrifter, umappede
// grupperes på normalisert label. Mengdene summeres per ENHET slik de er
// angitt («4 stk egg», ikke «232 g egg» – man handler i oppskriftens
// enheter); samme vare i to enheter gir to summer på linjen. Planer uten
// kjent middag (f.eks. arkivert etter planlegging) hoppes stille over.
export function aggregerHandleliste(
  planer: DinnerPlan[],
  middager: Dinner[],
): HandlelisteLinje[] {
  const middagPerId = new Map(middager.map((middag) => [middag.id, middag]));
  const linjer = new Map<
    string,
    { label: string; mengder: Map<Enhet, number>; antallRetter: number }
  >();

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
        mengder: new Map<Enhet, number>(),
        antallRetter: 0,
      };
      if (rad.amount !== null) {
        linje.mengder.set(rad.unit, (linje.mengder.get(rad.unit) ?? 0) + rad.amount);
      }
      if (!talteIDennePlanen.has(nokkel)) {
        linje.antallRetter += 1;
        talteIDennePlanen.add(nokkel);
      }
      linjer.set(nokkel, linje);
    }
  }

  return [...linjer.values()]
    .map((linje) => ({
      label: linje.label,
      // Fast enhetsrekkefølge (som i skjemaet) så linjene er stabile.
      mengder: ENHETER.filter((enhet) => linje.mengder.has(enhet)).map(
        (enhet) => ({ enhet, sum: linje.mengder.get(enhet)! }),
      ),
      antallRetter: linje.antallRetter,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "nb"));
}
