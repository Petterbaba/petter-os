const nokFormat = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});

const tallFormat = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });

export function formatNok(verdi: number): string {
  return nokFormat.format(verdi);
}

export function formatKg(verdi: number): string {
  return `${tallFormat.format(verdi)} kg`;
}

// NB: "YYYY-MM-DD" parses som UTC-midnatt, så formatering må også skje i
// UTC – ellers vises datoen én dag for tidlig for betraktere vest for UTC.
export function formatDato(isoDato: string): string {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(isoDato));
}

// ISO 8601-ukenummer (norsk standard: uke 1 er uken med årets første torsdag).
export function isoUkenummer(dato: Date): number {
  const d = new Date(Date.UTC(dato.getFullYear(), dato.getMonth(), dato.getDate()));
  const ukedag = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - ukedag);
  const forsteJanuar = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - forsteJanuar.getTime()) / 86_400_000 + 1) / 7);
}

export function formatMndKort(isoDato: string): string {
  return new Intl.DateTimeFormat("nb-NO", { month: "short", timeZone: "UTC" })
    .format(new Date(isoDato))
    .replace(".", "");
}

// «14. aug» – kompakt dato for listerader.
export function formatDatoKort(isoDato: string): string {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(isoDato))
    .replace(/\.$/, "");
}

// Norsk landnavn fra ISO 3166-1 alfa-2 («no» → «Norge»). Landnavn lagres
// aldri i databasen – de avledes alltid herfra. of() kaster på ugyldige
// koder, derfor try/catch med koden selv som nødløsning.
const landVisning = new Intl.DisplayNames(["nb"], { type: "region" });

export function landNavn(kode: string): string {
  try {
    return landVisning.of(kode.toUpperCase()) ?? kode.toUpperCase();
  } catch {
    return kode.toUpperCase();
  }
}

// «August 2026» – månedsoverskrift for tidsgrupperte lister (nb-NO gir
// liten forbokstav; som frittstående overskrift skal den ha stor).
export function formatMndAar(isoDato: string): string {
  const tekst = new Intl.DateTimeFormat("nb-NO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDato));
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}
