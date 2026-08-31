// Delt skjemavalidering for server actions (tredje skjemaet avgjorde
// abstraksjonen, jf. CLAUDE.md).

// Rund-tur-validering av «YYYY-MM-DD»: Date.parse ruller over umulige
// kalenderdatoer (2026-02-31 → 3. mars), så parse + reformater må gi
// nøyaktig samme streng tilbake.
export function erGyldigIsoDato(dato: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dato)) {
    return false;
  }
  const parset = new Date(`${dato}T00:00:00Z`);
  return (
    !Number.isNaN(parset.getTime()) &&
    parset.toISOString().slice(0, 10) === dato
  );
}

// Norsk tallformat godtas («12 500,50» → 12500.5, «80.000» → 80000);
// \s dekker også NBSP, som nb-NO-formatering bruker som tusenskille.
// null = ikke et tall. (Tredje skjemaet – mål – avgjorde abstraksjonen.)
export function parseNorskTall(input: string): number | null {
  const utenMellomrom = input.replace(/\s/g, "");
  if (utenMellomrom === "") {
    return null;
  }
  // Punktum-tusenskille («80.000», «1.234.567,89») må strippes før
  // komma→punktum – ellers tolkes «80.000» som 80. Utenfor det mønsteret
  // beholdes punktum som desimaltegn («82.4» → 82.4).
  const utenTusenskille = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(utenMellomrom)
    ? utenMellomrom.replace(/\./g, "")
    : utenMellomrom;
  const tall = Number(utenTusenskille.replace(",", "."));
  return Number.isFinite(tall) ? tall : null;
}
