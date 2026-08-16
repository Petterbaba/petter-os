# Neste steg

> **Denne filen er midlertidig.** Når alle punktene under er gjennomført:
> slett filen og commit slettingen (`git rm NESTE-STEG.md`). Veikartet
> videre bor permanent i CLAUDE.md; driftsdokumentasjon i `docs/`.
> Sist oppdatert: 9. august 2026 (journal-migrasjonen gjennomført).

## Gjennomført 8. august

- [x] Oppsett på stasjonær PC (npm install, `.env.local`, dev-server)
- [x] Signup slått AV i dashboardet
- [x] App-passordet rotert via ny `/innstillinger`-side (passordbytte i appen)
- [x] Wiki etablert i `docs/` (auth og brukeradministrasjon)
- [x] Backup-rutine på Windows: pg_dump (PostgreSQL 17) installert,
      `scripts/backup.sh` finner den automatisk, `SUPABASE_DB_URL` i
      `.env.local`, verifisert dump i `backups/`
- [x] Leaked password protection: AVKLART – krever Pro Plan, ikke
      tilgjengelig på free tier. Advisor-WARN er kjent og akseptert
      (kompensasjon: signup av, håndplukkede brukere, sterke passord).

## Små åpne punkter

- [ ] Slett `PASSORD.md` på den gamle maskinen (passordet den viste er
      rotert og dødt, men fjern filen likevel)
- [ ] Dashboardet → Authentication → Sign In / Providers → klikk
      **Email**-raden → sett «Minimum password length» til 12
      (free tier-erstatningen for leaked password protection)

## Rutiner (gjelder alltid)

- `npm run backup` ukentlig + ALLTID før migrasjoner
- Free tier auto-pauser etter ~1 ukes inaktivitet – daglig bruk av appen
  holder prosjektet våkent
- Feature-brancher på alt: `git switch -c feat/<navn>` FØR endringer,
  PR på GitHub, «Create a merge commit», rydd brancher etterpå

## GJENNOMFØRT 9. august: journal (branch `feat/journal`)

Hele journal-domenet er live på Supabase:

- Backup tatt før migrasjonen (`backups/petter-os-20260809-083052.sql`).
- Migrasjon applisert via MCP og filen omdøpt til skyens versjonsnummer:
  `supabase/migrations/20260809063105_journal.sql`. `list_migrations`
  speiler repoet 1:1.
- Advisors sjekket: security viser kun den kjente og aksepterte leaked
  password-WARNen (se over); performance kun INFO om ubrukte indekser
  (journal-indeksen er ny og naturlig ubrukt ennå).
- `src/lib/database.types.ts` regenerert (inneholder `journal_entries`).
- `src/lib/data/journal.ts` går mot `journal_entries` (nyest først);
  `src/lib/mock/journal.ts` er slettet.
- Skjema for ny innførsel på `/journal`: `src/app/journal/actions.ts`
  etter metrikker-mønsteret + `JournalSkjema` (+ ny delt `SkjemaTekstFelt`
  for flerlinjetekst). `JournalModul` fikk tom-tilstand (databasen starter
  tom). `npx tsc --noEmit` er ren.

Utvidet samme dag (samme branch): én innførsel per dag + dagsvurdering 1–5.

- Migrasjoner: `20260809070743_journal_one_entry_per_day` (unik
  `(user_id, written_on)`; den gamle ikke-unike indeksen droppet – unik-
  indeksen dekker listespørringen) og `20260809070802_day_rating_metric`
  (`day_rating` som rad i `metric_types` – metrics-modellen gjenbrukt,
  ingen ny tabell). Backup tatt først
  (`backups/petter-os-20260809-090651.sql`); advisors fortsatt grønn;
  `database.types.ts` uendret (verifisert mot regenerert output).
- Ny innførsel på opptatt dag avvises (23505 fra unik nøkkel → «åpne den
  med Rediger»-melding). Redigering via `/journal?rediger=<id>` oppdaterer
  via id, så en innførsel kan også flyttes til en ledig dato.
- Dagsvurdering: 1–5-velger på `/journal` (gjelder dagen i fokus – den
  redigerte dagen, ellers i dag), vises som «n/5» i journallisten
  (flettes inn i datalaget fra `metric_entries`).

Tredje runde (samme branch): heatmap + samlet skjema + animert knapp.

- `/journal` har fått «Skrivedager»-heatmap øverst (binært: dag med/uten
  innførsel, tittel + vurdering i tooltip, rekke + siste-30 i headeren).
  Rutenettet er trukket ut i delt `HeatmapRutenett` som også `VaneModul`
  bruker; datohjelpere flyttet til `src/lib/dato.ts`.
- Skjemaet er slått sammen: dagsvurderingen (radioknapper 1–5) står til
  høyre for datofeltet, tittel under, tekst nederst. Én action lagrer
  innførsel og/eller vurdering – vurdering alene er gyldig lagring (ny-
  modus). `DagsvurderingVelger` er slettet.
- Lagre-knappen er animert (egenbygd SaveToggle-variant i appens tokens,
  ingen nye avhengigheter): pill → spinner-sirkel → hake → «Lagret» →
  idle, drevet av ekte skjema-status. `motion-reduce` respekteres.

Gjenstår manuelt (Petter):

- [ ] Test i appen: `npm run dev` → `/journal` → lagre en innførsel med
      vurdering, rediger den, slett en innførsel (bekreftelsesdialog),
      prøv å lagre ny på samme dag (skal avvises),
      lagre en vurdering alene, sjekk heatmapet og `/dashbord`, og se at
      lagre-animasjonen kjører. Sjekk også `/vaner`: heatmapet der deler
      komponent med journalen og har fått samme løft (heldekkende bredde,
      egne tooltips, stor forbokstav på etikettene).
- [ ] PR fra `feat/journal`, «Create a merge commit», rydd branchen.

## Neste utviklingsøkter (revidert prioritering)

Habits (fase 2) er UTSATT – innholdet (hvilke vaner) er ikke avklart.
Modellen er triviell; den venter til vanene er bestemt.

1. **Journal-editor** (`feat/journal-editor`) – notert 9. aug: dagens
   rene `<textarea>` skal erstattes av en ordentlig skriveopplevelse på
   `/journal`. Ambisjonsnivå avklares når økten starter (markdown?
   forhåndsvisning? autolagring av utkast?). NB: visningen bruker
   allerede `whitespace-pre-line`, så linjeskift bevares – editoren
   bygger videre på det.
2. **Reiser** (`feat/reiser`) – start på Memory Bank: én tabell
   `trips(title, country, city, started_on, ended_on, cost, rating, notes)`,
   ny rute `/reiser` + menypunkt. Bevisst minimal – kart/årsrapport senere.
3. **Vaner** – når innholdet er modent. Deretter veikartet i CLAUDE.md
   (trening, investeringer, mat, eksport/herding).

## Ferdig?

Alle bokser huket av og filen erstattet av CLAUDE.md/docs → `git rm NESTE-STEG.md`.
