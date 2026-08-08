// Felles resultat-type for server actions (brukes med useActionState).
// React 19 nullstiller ukontrollerte felt når en action fullfører – også
// ved feil. `verdier` lar skjemaet gjeninnsette brukerens input som
// defaultValue (aldri passord).
export type ActionResultat =
  | { ok: true; melding?: string }
  | { ok: false; melding: string; verdier?: Record<string, string> };
