// «I dag» som YYYY-MM-DD i norsk tid – uavhengig av serverens tidssone.
// (sv-SE gir ISO-format; timeZone-opsjonen er poenget: på en UTC-host er
// serverens lokale dato gårsdagen mellom midnatt og 01/02 norsk tid.)
const osloDatoFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Oslo",
});

export function iDagOslo(): string {
  return osloDatoFormat.format(new Date());
}
