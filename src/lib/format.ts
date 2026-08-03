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

export function formatDato(isoDato: string): string {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
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
  return new Intl.DateTimeFormat("nb-NO", { month: "short" })
    .format(new Date(isoDato))
    .replace(".", "");
}
