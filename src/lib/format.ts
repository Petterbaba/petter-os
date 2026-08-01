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

export function formatMndKort(isoDato: string): string {
  return new Intl.DateTimeFormat("nb-NO", { month: "short" })
    .format(new Date(isoDato))
    .replace(".", "");
}
