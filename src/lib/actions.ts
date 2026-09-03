// Felles resultat-type for server actions (brukes med useActionState).
// React 19 nullstiller ukontrollerte felt når en action fullfører – også
// ved feil. `verdier` lar skjemaet gjeninnsette brukerens input som
// defaultValue (aldri passord).
// `lenke` lar en vellykket action peke videre (Oda-kurven) uten redirect.
export type ActionResultat =
  | { ok: true; melding?: string; lenke?: { href: string; tekst: string } }
  | { ok: false; melding: string; verdier?: Record<string, string> };
