import type { CookingSession, DinnerStep } from "./types";

// Ren logikk for kokeboken og matlagingsøktene (maal.ts-/enheter.ts-
// presedensen): ingen Supabase, ingen React. Varighet, «sist laget» og
// neste steg er AVLEDET her og lagres aldri.

// Odas vanskelighetsgrader i små bokstaver (difficultyString «Lett» →
// «lett»). Samme sett som check-constrainten i kokebok-migrasjonen – en
// ny verdi krever en migrasjon, og importen skal stoppe, ikke gjette.
export const VANSKELIGHETER = ["lett", "middels", "vanskelig"] as const;

export type Vanskelighet = (typeof VANSKELIGHETER)[number];

export function erVanskelighet(verdi: string): verdi is Vanskelighet {
  return (VANSKELIGHETER as readonly string[]).includes(verdi);
}

const VANSKELIGHET_TEKST: Record<Vanskelighet, string> = {
  lett: "Lett",
  middels: "Middels",
  vanskelig: "Vanskelig",
};

export function vanskelighetTekst(vanskelighet: Vanskelighet): string {
  return VANSKELIGHET_TEKST[vanskelighet];
}

// Hele minutter mellom start og slutt, minus pausetid – minst 1, så en
// lynrask økt aldri vises som «0 min».
export function varighetMinutter(
  startedAt: string,
  endedAt: string,
  pausedSeconds = 0,
): number {
  const sekunder =
    (Date.parse(endedAt) - Date.parse(startedAt)) / 1000 - pausedSeconds;
  return Math.max(1, Math.round(sekunder / 60));
}

// Sekunder brukt så langt i en pågående økt (timeren). Under pause står
// klokken stille på pausestarten; avsluttede pauser er trukket fra.
export function sekunderBrukt(
  okt: Pick<CookingSession, "startedAt" | "pausedAt" | "pausedSeconds">,
  naaSekunder: number,
): number {
  const start = Math.floor(Date.parse(okt.startedAt) / 1000);
  const slutt =
    okt.pausedAt === null
      ? naaSekunder
      : Math.floor(Date.parse(okt.pausedAt) / 1000);
  return Math.max(0, slutt - start - okt.pausedSeconds);
}

// «32 min», «1 t», «1 t 5 min» – oppskriftens tid og øktens varighet.
export function formatVarighet(minutter: number): string {
  if (minutter < 60) {
    return `${minutter} min`;
  }
  const timer = Math.floor(minutter / 60);
  const rest = minutter % 60;
  return rest === 0 ? `${timer} t` : `${timer} t ${rest} min`;
}

// Timerens visning: «04:05», over en time «1:02:34». Negative verdier
// (DB-klokken foran klienten) klemmes til null.
export function formatKlokke(sekunder: number): string {
  const totalt = Math.max(0, Math.floor(sekunder));
  const timer = Math.floor(totalt / 3600);
  const minutter = Math.floor((totalt % 3600) / 60);
  const sek = totalt % 60;
  const toSiffer = (tall: number) => String(tall).padStart(2, "0");
  return timer > 0
    ? `${timer}:${toSiffer(minutter)}:${toSiffer(sek)}`
    : `${toSiffer(minutter)}:${toSiffer(sek)}`;
}

// Metalinjen «25 min · Lett · 4 porsjoner» – delene som mangler utelates.
// Delt av kokebok-listen, oppskriftssiden og oppskriftsvisningen på /mat.
export function oppskriftMeta(
  oppskrift: {
    cookMinutes: number | null;
    difficulty: Vanskelighet | null;
    servings: number;
  },
  { medPorsjoner = true }: { medPorsjoner?: boolean } = {},
): string {
  const deler: string[] = [];
  if (oppskrift.cookMinutes !== null) {
    deler.push(formatVarighet(oppskrift.cookMinutes));
  }
  if (oppskrift.difficulty !== null) {
    deler.push(vanskelighetTekst(oppskrift.difficulty));
  }
  if (medPorsjoner) {
    deler.push(
      `${oppskrift.servings} ${oppskrift.servings === 1 ? "porsjon" : "porsjoner"}`,
    );
  }
  return deler.join(" · ");
}

// Nyeste avsluttede økt per middag. Forutsetter at øktene kommer nyest
// først (datalaget sorterer på ended_at), så første treff per rett vinner.
export function sisteOktPerMiddag(
  okter: CookingSession[],
): Map<string, CookingSession> {
  const siste = new Map<string, CookingSession>();
  for (const okt of okter) {
    if (!siste.has(okt.dinnerId)) {
      siste.set(okt.dinnerId, okt);
    }
  }
  return siste;
}

// «Hvilket steg er jeg på?» – første steg som ikke er huket av.
export function nesteSteg(
  steg: DinnerStep[],
  gjorteIder: ReadonlySet<string>,
): DinnerStep | null {
  return steg.find((etSteg) => !gjorteIder.has(etSteg.id)) ?? null;
}
