# Neste steg

> **Denne filen er midlertidig.** Når alle punktene under er gjennomført:
> slett filen og commit slettingen (`git rm NESTE-STEG.md`). Veikartet
> videre bor permanent i CLAUDE.md; driftsdokumentasjon i `docs/`.
> Sist oppdatert: 27. august 2026 (mål-modulen levert, ikke committet).

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
- [ ] **Passord-sjekk etter 16. aug:** app-passordet ble nullstilt til et
      midlertidig (glemt passord etter maskinbyttet). Bekreft at du har
      satt ditt eget via `/innstillinger` og lagret det i passordmanageren
      – det midlertidige står i en samtalelogg og skal ikke leve videre.

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

- [x] Testet i appen (ekte innførsler skrevet 5.–16. aug, redigering,
      sletting og dagsvurdering brukt i praksis)
- [x] PR #3 merget 16. aug, branchen ryddet lokalt og på GitHub

## GJENNOMFØRT 16. august: journal fullført og merget

- Prosjektet var auto-pauset (første gang – rutinen under stemmer);
  vekket via MCP `restore_project`, oppe igjen på ~10 sek.
- To lint-feil fra 9.-aug-arbeidet fikset (`react-hooks/set-state-in-effect`
  i `JournalSkjema` og `LagreKnappAnimert`) – tredje gang denne regelen
  slår til i prosjektet. Mønsteret som gjelder: «adjust state during
  render» (eller `useSyncExternalStore` for klient-bare verdier), aldri
  synkron setState i effect-kroppen.
- Journallisten bygget om (PR #4): tidsgruppert med sticky
  månedsoverskrifter, kompakte rader (dato + tittel + n/5) som utvides
  med native `<details>` – nye datohjelpere `formatDatoKort`/`formatMndAar`
  i `format.ts` (UTC-regelen fulgt).
- Git-lærdom fra økten (commit havnet på feil side av en merge og måtte
  cherry-pickes til ny gren): sjekk at PR-en faktisk er merget FØR
  opprydding – kvitteringen er at `git pull` henter noe. Push ≠ merge.

## GJENNOMFØRT 16.–17. august: Reiser (Memory Bank fase 1)

Fremskyndet forbi journal-editoren på eget ønske – og med kart fra dag én
(ikke utsatt som planlagt). Migrasjon `20260816193703_trips`; klikkbart
vendored verdenskart (CC BY-SA 3.0, ingen nye avhengigheter);
registrering OG redigering i native <dialog> (kart-klikk = primærinngang,
«Ny reise» = manuell); årsgruppert liste. Review-workflow fant og fikset
4 reelle feil, bl.a. at 37 land i SVG-en er <g>-grupper (Norge inkludert
– kartet hadde vært dødt for dem). Tredje skjema utløste delt
datovalidering (`src/lib/validering.ts`). Detaljer i CLAUDE.md
(«Reiser»-seksjonen). NB: committet direkte til main (bevisst unntak fra
gren-regelen, alenearbeid + allerede reviewet).

## GJENNOMFØRT 26.–27. august: Mål (misogi + fremdriftsmål, fase 4c)

Fremskyndet på eget ønske. Migrasjon `20260826093446_goals` (goals +
goal_entries; RLS-malen + eierskaps-sjekk på innslag-insert); advisors
grønn; `database.types.ts` regenerert. Detaljer i CLAUDE.md
(«Mål»-seksjonen).

- Misogi: ett årsdefinerende mål per år (delvis unik indeks; skjemaet
  tilbyr kun ledige år). Utfall planlagt/forsøkt/fullført + refleksjon
  settes via egen action – «forsøkt» hedres, redigering rører dem aldri.
- Tre sporingsmoduser avledet av kolonnene: manuell (sum av innslag),
  metrikk-lenket (vekt m.m.) og telle-lenket (journal/reiser/nye land).
  Fremdrift lagres aldri; pacing («i rute») i `src/lib/maal.ts`.
- `/maal` (MisogiKort + MaalListe + dialog med fire skjema), MaalModul på
  dashbordet, menypunkt; «mål» i vane-copyen omdøpt (betyr nå kun domenet).
- `parseNorskTall` trukket ut til `validering.ts` (tredje konsument) og
  lærte punktum-tusenskille («80.000» ble tolket som 80 før).
- Review (10 vinkler): 8 reelle feil funnet og fikset – bl.a. planlagte
  fremtidige reiser som talte som fremdrift, målinger etter fristen som
  kunne av-fullføre utløpte mål, og baseline på feil side av startdatoen.
- Kjente utsatte punkter: duplisert mønsterkode (delte hooks, felles
  slett-knapp, statustriage – ta med `/simplify` på committet tilstand)
  og 1000-raders-taket i avledningen (flyttes til DB-telling FØR
  datamengdene vokser, senest i fase 7).

Gjenstår manuelt (Petter):

- [ ] Fullfør testløypa (særlig metrikk- og telle-mål mot ekte data)
- [ ] Commit: gren-regelen sier `feat/maal` + PR; trips-presedensen
      (alenearbeid + allerede reviewet → rett til main) er også gyldig –
      velg og noter valget
- [ ] `npm run backup` (ukesrutinen; goals-migrasjonen laget kun nye
      tabeller, så den gikk uten – ta den nå som ukesbackup)

## Neste utviklingsøkter (revidert prioritering)

Habits (fase 2) er UTSATT – innholdet (hvilke vaner) er ikke avklart.
Modellen er triviell; den venter til vanene er bestemt.

0. **Mat: ukesplanlegger med Oda-data** (`feat/mat`) – besluttet 31. aug,
   startes i EGEN økt: fase 6 (mat) fremskyndes som ukesplanlegger, og
   Petter har funnet at Oda har et API. Første steg i økten: undersøk
   API-et (offisielt/uoffisielt? auth? vilkår?) og design domenet etter
   Hardcover-prinsippet – importer FAKTA til egne tabeller (dataeierskap),
   aldri lene seg på tredjepart i lesebanen. Bøker fase 1 (under) rykker
   ned, Hardcover-token fortsatt ikke ordnet.
1. **Bøker + Hardcover-synk** (`feat/boker`) – avtalt 26. aug: egen
   `books`-tabell (dataeierskap – Hardcover er kilde, ikke fasit),
   «Synk fra Hardcover»-server action (GraphQL, `HARDCOVER_API_TOKEN`
   kun i `.env.local`), og `count_source 'bøker'` i mål-modellen →
   «Les 12 bøker i år» blir helautomatisk. Importer FAKTA (leste bøker),
   aldri Hardcovers goals-objekter. Petter først: opprett
   Hardcover-bruker, importer fra Goodreads, hent API-token.
2. **Journal-editor** (`feat/journal-editor`) – notert 9. aug: dagens
   rene `<textarea>` skal erstattes av en ordentlig skriveopplevelse på
   `/journal`. Ambisjonsnivå avklares når økten starter (markdown?
   forhåndsvisning? autolagring av utkast?). NB: visningen bruker
   allerede `whitespace-pre-line`, så linjeskift bevares – editoren
   bygger videre på det.
3. **Vaner** – når innholdet er modent. Deretter veikartet i CLAUDE.md
   (trening, investeringer, mat, eksport/herding) – og Memory
   Bank-utvidelser på reiser (trip_stops, årsrapport) når det frister.

## Ferdig?

Alle bokser huket av og filen erstattet av CLAUDE.md/docs → `git rm NESTE-STEG.md`.
