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
