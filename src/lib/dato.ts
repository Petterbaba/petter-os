// «I dag» som YYYY-MM-DD i norsk tid – uavhengig av serverens tidssone.
// (sv-SE gir ISO-format; timeZone-opsjonen er poenget: på en UTC-host er
// serverens lokale dato gårsdagen mellom midnatt og 01/02 norsk tid.)
const osloDatoFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Oslo",
});

export function iDagOslo(): string {
  return osloDatoFormat.format(new Date());
}

// Kalenderregning på ISO-datostrenger (heatmap m.m.). Lokal tid er bevisst:
// strengene tolkes og formateres i samme sone, så det er rund-tur-sikkert.
export function parseIsoDato(iso: string): Date {
  const [aar, mnd, dag] = iso.split("-").map(Number);
  return new Date(aar, mnd - 1, dag);
}

export function tilIsoDato(dato: Date): string {
  const aar = dato.getFullYear();
  const mnd = String(dato.getMonth() + 1).padStart(2, "0");
  const dag = String(dato.getDate()).padStart(2, "0");
  return `${aar}-${mnd}-${dag}`;
}

// Alle dager fra og med `fra` til og med `til`, som ISO-strenger.
export function dagerIPeriode(fra: string, til: string): string[] {
  const dager: string[] = [];
  const slutt = parseIsoDato(til);
  for (const d = parseIsoDato(fra); d <= slutt; d.setDate(d.getDate() + 1)) {
    dager.push(tilIsoDato(d));
  }
  return dager;
}
