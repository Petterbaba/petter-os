# Neste steg

> **Denne filen er midlertidig.** Når alle punktene under er gjennomført:
> slett filen og commit slettingen (`git rm NESTE-STEG.md`). Veikartet
> videre bor permanent i CLAUDE.md; driftsdokumentasjon i `docs/`.
> Sist oppdatert: 27. september 2026 (kokeboken levert på `feat/kokebok`;
> neste store økt er «Oda: handlelisten blir kurven», punkt 0 nederst).

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

## GJENNOMFØRT 27. september: ukesplan og kokebok

Mat (fase 6) ble levert 1.–6. sep (se CLAUDE.md, «Mat»). Denne dagen:

- **Ukesplanen** (PR fra `feat/ukesplan-dra-og-slipp`, merget): faste
  kortstørrelser og fullt dagsnavn, dra-og-slipp mellom dager
  (`@dnd-kit/core`; ledig dag = flytt, opptatt = bytt), minus på kortene
  og pluss/minus i dagsvelgeren, dagens middag øverst i dagsvelgeren.
- **Kokeboken** (`feat/kokebok`): `/kokebok` med én editor for alle
  middager (dialogeditoren på `/mat` er fjernet), steg som egne rader,
  tid og vanskelighetsgrad, og matlagingsmodus på oppskriftssiden: timer
  med Pause/Fortsett og Avbryt, avhuking per steg, «Ferdig – lagre
  tiden» nederst (eller siste steg), historikk med sletting og bryteren
  «Hold skjermen på». Migrasjoner `20260927154258_kokebok` (backfill:
  152 steg i 34 middager) og `20260927185401_kokebok_pause`; backup tatt
  før begge; advisors grønne. Detaljer i CLAUDE.md («Kokebok»).

Gjenstår manuelt (Petter):

- [ ] Test pause-runden lokalt: start, pause, fortsett, avbryt, fullfør
      med «Ferdig», slett de to testøktene (11 og 41 sek) i historikken
- [ ] PR for `feat/kokebok` → merge → sjekk `/mat` og `/kokebok` på
      petter-os.vercel.app → `git switch main && git pull` → slett
      branchen lokalt
- [ ] IKKE rediger oppskrifter i produksjon før deployen er ute (gammel
      kode skriver fremgangsmåten til tekstkolonnen ny kode ikke leser)

## Neste utviklingsøkter (revidert prioritering)

Habits (fase 2) er UTSATT – innholdet (hvilke vaner) er ikke avklart.
Modellen er triviell; den venter til vanene er bestemt.

0. **Oda: handlelisten blir kurven** (`feat/oda-handleliste`) – besluttet
   27. sep. Retningsendring: Oda skal gjøre det enklere å BESTILLE, med
   egen kokebok som kilde (oppskriftene trenger ikke finnes hos Oda).
   Kjeden er ukesplan → aggregert handleliste → **handlelisten er det som
   havner i Oda-kurven**, og det er den som optimaliseres.

   **Problemet i dag:** «Legg i Oda-kurven» sender Oda-*oppskriftene*
   (`oda_recipe_id`) én og én. Oda velger da varer og mengder per
   oppskrift, egne retter hoppes over, og ingenting kan optimaliseres
   fordi appen aldri bestemmer hva som havner i kurven.

   **Fakta (sjekket 27. sep):**
   - Kurv-verktøyet (`manipulate_cart`) tar `productId` + antall, ikke
     bare oppskrifter. Antall er alltid en delta – les `get_cart` først.
   - Katalogen har 6 489 varer; 98 % har pris + enhetspris (kg/l/stk).
     Pakkestørrelse = pris / enhetspris (stikkprøver: «370 g» → 0,370 kg,
     «18 stk» egg → 1,080 kg).
   - 331 ingrediensrader: 320 koblet til Matvaretabellen, bare 12 til et
     Oda-produkt; 323 i gram, 4 i stk, 4 i ss.
   - `aggregerHandleliste` (`src/lib/ernaering.ts`) slår alt sammen på
     matvare og summerer per enhet – men kjenner ikke Oda-produkter.

   **Foreslått kjede:**
   1. Vare-kobling per MATVARE (ikke per rett): «kjøttdeig» → ett
      Oda-produkt, gjelder alle oppskrifter. ~100 valg i stedet for 331.
      Ev. overstyring per rett (`dinner_ingredients.oda_product_id`
      finnes alt). Krever en ny per-bruker-tabell (migrasjon).
   2. Handleliste per Oda-produkt med antall pakker: behov i gram →
      hele pakker, rester synlige («700 g → 2 × 400 g, 100 g til overs»).
      Gram ↔ stk/l via `src/lib/enheter.ts`.
   3. «Har hjemme»: salt, olje, krydder hakes bort; appen husker
      basisvarene.
   4. Optimalisering: samme vare på tvers av retter (automatisk), større
      pakke når kiloprisen er lavere (forslag), rester. Overlapp-forslag i
      ukesplanen (parkert idé i CLAUDE.md) kan bygge på samme grunnlag.
   5. Kurven fylles med VARER: les kurven, send kun differansen, så et
      nytt trykk aldri dobler.

   **Valg som må tas før planen skrives** (anbefaling først):
   - Kobling per matvare med overstyring per rett – eller bare per rett?
   - Skal optimaliseringen foreslå (du godkjenner) eller bestemme selv?
   - Fjerne den oppskriftsbaserte kurv-banen helt (Oda-id blir bare
     kildereferanse) – eller beholde den ved siden av?

   **Regler:** Si fra FØR Oda-kurven leses eller endres. Priser og
   pakkestørrelser er volatile Oda-data og lagres aldri utover katalog-
   cachen (CLAUDE.md, «Ukeshandel»). Appen skriver til Oda-MCP, men leser
   priser fra den lokale katalogen.

   **Gjør først (små, samme økt eller før):**
   - Migrasjon 2 for kokeboken: `kokebok_drop_instructions` (dropper
     `dinners.instructions`) – KUN etter at `feat/kokebok` er deployet.
     Etternøler-backfill + sikring, se CLAUDE.md («Kokebok»).
   - Tid og vanskelighetsgrad for de 34 Oda-rettene – rutinen står i
     `docs/mat-synk-og-import.md` («Oppfølging»).
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
