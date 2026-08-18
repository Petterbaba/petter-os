@AGENTS.md

# petter-os

Personlig dashbord («personal operating system») med Petter som primærbruker.
Tracker styrketrening, investeringer, kroppsmetrikker, vaner og
journal/refleksjoner. Repoet er OFFENTLIG (aldri hemmeligheter eller
persondata i committede filer), og appen kan få noen få håndplukkede brukere
til – anta flere brukere i design, aldri hardkodet «én bruker».
Læringsprosjekt for stacken – gjør ting riktig, ikke bare raskt.

**Kjerneprinsipp: dataeierskap.** Alle data skal kunne eksporteres. Ingen
innlåsing i tredjepartsformater.

Driftsdokumentasjon («hvordan gjør jeg …») bor i wikien `docs/` – se
`docs/README.md`. Auth/brukeradministrasjon: `docs/auth-og-brukere.md`.

## Stack

- Next.js 16 (App Router; NB: `src/proxy.ts`, ikke middleware) + TypeScript +
  Tailwind CSS v4 (CSS-first config i `src/app/globals.css`)
- Grafer: recharts. Heatmapene (vaner, journal) er håndbygd CSS-grid via
  delt `HeatmapRutenett`.
- Database: Supabase-prosjekt `petter-os` (ref `mexwxvntjcyinesoiyvw`),
  eu-north-1, free tier. NB: free tier auto-pauser etter ~1 ukes inaktivitet
  og har ingen automatiske backups (se Backup).
- `@supabase/ssr` + `@supabase/supabase-js` er de eneste dataavhengighetene.
- Kjøres lokalt med `npm run dev`; hosting er ikke besluttet.

## Viktig: git

**Brukeren håndterer all git selv (læringsformål). Kjør ALDRI git-kommandoer**
– ikke init, add, commit, push eller noe annet som endrer git-tilstand.

## Auth og sikkerhet

- Full Supabase Auth + RLS. E-post + passord. Primærbruker
  p.bergandersen@gmail.com; ev. nye brukere opprettes MANUELT i dashboardet
  (Authentication → Users → Create new user). Signup er AVSLÅTT og skal
  aldri på – repoet er offentlig. Se `docs/auth-og-brukere.md`.
- Passordbytte for innloggede: `/innstillinger` (server action med
  `updateUser()`; verifiserer dagens passord først). Ingen reset-flyt for
  uinnloggede – nødutgang er admin-grep, se wikien.
- All datatilgang er server-side: server components leser, server actions
  skriver. Ingen browser-side Supabase-klient.
- `src/proxy.ts` (Next 16-navnet på middleware) fornyer sesjonen per request
  og redirecter uinnloggede til `/logg-inn`. Bruk alltid `auth.getUser()`
  (validerer token), aldri `getSession()`, i proxy/server.
- Klient-fabrikk: `src/lib/supabase/server.ts`.
- Nøkler: KUN publishable key i appen (`.env.local`, mal i `.env.example`).
  `SUPABASE_DB_URL` (Session pooler) brukes kun av `scripts/backup.sh`.
  Service role-nøkkelen brukes aldri.

## Datalag (kontrakt/implementasjon-skille)

- `src/lib/types.ts` – håndskrevne camelCase-domenetyper = UI-ets kontrakt.
  Komponenter kjenner KUN disse.
- `src/lib/data/<domene>.ts` – én modul per domene (metrics, workouts,
  investments, journal, habits, trips); mapper DB-rad → domenetype. Bytte
  av datakilde skjer kun her.
- `src/lib/data/dashboard.ts` – komponerer `DashboardData` med `Promise.all`.
- `src/lib/mock/<domene>.ts` – mock for domener som ikke er migrert ennå.
  Slettes per domene når det går live.
- `src/lib/database.types.ts` – GENERERT (Supabase MCP
  `generate_typescript_types` etter hver migrasjon). Importeres kun av
  datalaget, aldri av komponenter.
- Undersider henter kun sitt eget domene (`/metrikker` → `getVekt()`);
  kun `/dashbord` bruker `getDashboardData()`.
- Status: **metrics, journal og reiser (trips) er live på Supabase**;
  workouts, investments, habits er fortsatt mock.
- Delt skjemavalidering: `src/lib/validering.ts` (`erGyldigIsoDato` –
  rund-tur-sjekken alle actions bruker).

## Migrasjonsflyt (remote-first – absolutte regler)

0. **KUN prosjektet `petter-os` (ref `mexwxvntjcyinesoiyvw`).** Alle
   Supabase MCP-kall skal ha denne `project_id`. Rør aldri andre prosjekter
   på kontoen, og bruk aldri kontonivå-verktøy som oppretter, pauser eller
   sletter prosjekter. (MCP-serveren i `.mcp.json` kan ikke scopes via URL –
   `?project_ref=` bryter OAuth-flyten – så denne regelen er håndhevingen.)
1. SQL-fil skrives FØRST i `supabase/migrations/YYYYMMDDHHMMSS_slug.sql`
   (CLI-kompatibel navngiving).
2. Appliseres via Supabase MCP `apply_migration` (aldri dashboard-SQL for
   endringer; dashboard kun til lesing).
3. Skyen tildeler eget versjonsnummer – **omdøp filen etterpå** slik at
   `list_migrations` speiler repoet 1:1.
4. En applisert migrasjonsfil redigeres ALDRI – ny endring = ny migrasjon.
5. Etter hver migrasjon (obligatorisk): `get_advisors` (security +
   performance) skal være grønn → `generate_typescript_types` →
   oppdater `src/lib/database.types.ts`.
6. Flyten kan senere oppgraderes til lokal CLI-stack
   (`supabase init && supabase link`) uten filendringer.

## Databasekonvensjoner

- uuid-PK `gen_random_uuid()`; dagkolonner `date` med `*_on`-suffiks;
  `created_at`/`updated_at` + delt trigger `public.set_updated_at()` (fra
  core-migrasjonen); `numeric` for vekt/penger; snake_case i DB.
- **RLS-mal på alle rad-eiende tabeller** (kopier fra
  `20260805190354_metrics.sql`): `user_id uuid not null default auth.uid()`
  + fire policyer (select/insert/update/delete) `to authenticated` med
  `(select auth.uid())`. Barnetabeller denormaliserer `user_id`. Appen
  sender aldri user_id – defaulten gjør jobben. **Ingen FK mot auth.users**
  (Supabase fraråder det; blokkerte brukersletting og gjorde backupen
  urestorerbar – se `20260805200000_metrics_drop_auth_fk.sql`).
- Katalogtabeller (habits, accounts, exercises, food_items) arkiveres med
  `archived_at`, slettes aldri.
- Avledede tall lagres aldri – bruk views (`weekly_volume`,
  `portfolio_history`, `daily_nutrition`) eller beregn i datalaget.
- Metrics er LANG modell: `metric_types(key,label,unit)` +
  `metric_entries(metric_key, measured_on, value)`. Ny metrikk = én
  INSERT i `metric_types`, ikke ny tabell – gjelder også utover kropp
  (journalens dagsvurdering er nøkkelen `day_rating`). Presis validering
  (30–250 kg, 1–5 o.l.) bor i server-actionen; DB håndhever kun generisk
  `value >= 0`.

## Input-mønster (server actions)

- Server actions + `useActionState`; ikke API-routes, ikke optimistisk UI,
  ikke zod (revurderes ved økt-logging i fase 3 – tredje skjema avgjør evt.
  abstraksjon).
- Delt: `ActionResultat` (`src/lib/actions.ts`),
  `src/components/skjema/{SkjemaFelt,LagreKnapp}.tsx`.
- Mal: `src/app/metrikker/actions.ts` + `src/components/VektSkjema.tsx` –
  norsk komma godtas, rund-tur-datovalidering (Date.parse ruller over
  umulige datoer!), `revalidatePath` på berørte sider, generiske
  feilmeldinger i UI med detaljer kun i serverlogg, og `verdier` i
  feil-resultatet så React 19s skjema-reset ikke sletter brukerens input.
- **Datoregler:** «i dag» = `iDagOslo()` fra `src/lib/dato.ts` (norsk tid
  uansett server-TZ – aldri `new Date()`-basert dato uten timeZone).
  `formatDato`/`formatMndKort` formaterer ISO-datostrenger i UTC (ellers
  vises datoer én dag feil vest for UTC).
- Upsert-nøkkel for målinger: `(user_id, metric_key, measured_on)` – ny
  lagring samme dag overskriver. Journal upserter ALDRI: unik
  `(user_id, written_on)` gjør at insert på opptatt dag gir 23505, som
  oversettes til en «rediger i stedet»-melding; redigering oppdaterer
  via id (tekst skal aldri overskrives stille).

## Backup (dataeierskap)

- `npm run backup` → `scripts/backup.sh` → `pg_dump` (via Session pooler) til
  gitignored `backups/`. Krever `SUPABASE_DB_URL` i `.env.local` og pg_dump
  (`brew install libpq && brew link --force libpq`).
- Rutine: ukentlig + ALLTID før migrasjoner som endrer eksisterende tabeller.
- Fase 7 legger `export_all()`-RPC + eksport-side i appen.

## Designvalg

- Mørkt, rolig «personlig kontrollrom» – cockpit, ikke SaaS-salgsside.
  Ingen navbar; all navigasjon via menyen på hjemsiden. Mobil først.
- Tokens i `@theme` i `globals.css`: `bg`, `card`, `edge`/`grid`/`axis`,
  `ink`/`ink-2`/`ink-3`, `accent`, `heat-0`–`heat-4`.
- **Én aksentfarge: rav/gull `#c98500`** – validert mot kortflaten `#161614`
  (dataviz-skillens validator). Tekst bruker ink-tonene, aldri aksent
  (unntak: logo-detalj). Heat-trappen er validert som ordinal rampe – endre
  ikke uten å kjøre validatoren på nytt.
- Grafkonvensjoner: 2px linjer, arealfyll ~10 %, søyler ≤18px m/4px radius,
  hårfine gridlinjer, én serie per graf (ingen legend), tooltips overalt,
  `tabular-nums` kun på tallkolonner, runde akse-ticks.
- UI-språk: norsk (bokmål); `nb-NO`-formatering via `src/lib/format.ts`.

## Ruter

`/` hjem (klokke + meny) · `/dashbord` alt samlet · `/vaner` heatmap + radar ·
`/styrke` · `/investeringer` · `/metrikker` (vekt-input + kurve) · `/journal` ·
`/reiser` (klikkbart kart + skjema + liste) · `/innstillinger`
(konto/passordbytte) · `/logg-inn` (eneste uinnloggede side).
Undersider bruker `SideHeader`.

## Reiser (Memory Bank)

- `trips`-tabellen: title, country_code (ISO 3166-1 alfa-2, SMÅ bokstaver),
  city, started_on/ended_on, cost_nok, rating 1–5, companions, category
  (ferie/helgetur/jobb/familiebesøk/annet), notes. Fremtidige datoer er
  tillatt (planlagte turer). Landnavn og netter er avledet – aldri lagret;
  landnavn via `landNavn()` i `format.ts` (`Intl.DisplayNames`, nb).
- Verdenskartet er en vendored SVG (`src/lib/kart/verdenskart.svg`,
  **CC BY-SA 3.0**, Al MacDonald/Fritz Lekschas – attribusjonen ligger i
  SVG-ens `<desc>` og skal bli der). Path-id = ISO-kode; `src/lib/kart.ts`
  leser/cacher og merker klasser server-side, `.reisekart`-CSS i globals
  styler med heat-trappen. Klikk håndteres med event-delegering i
  `ReiseUtforsker` (valgt land = delt tilstand for kart, skjema og liste).
  NB: 37 land er `<g>`-grupper i SVG-en – all kart-CSS/JS må treffe både
  `path.klasse` og `g.klasse path` (se .reisekart i globals).
- Registrering og redigering skjer i samme native `<dialog>`: klikk på et
  land åpner den med landet forhåndsvalgt (primærinngangen); «Ny reise»-
  knappen åpner den for manuell registrering; «Rediger» i listen åpner den
  forhåndsutfylt (skjult id-felt → oppdatering via id, journal-mønsteret;
  ny key per mål). Dialogen lukkes med Esc, bakteppe-klikk, Avbryt eller
  automatisk ~1,6 s etter vellykket lagring.
- Fremtidige utvidelser (egne migrasjoner): `trip_stops` (flere stopp),
  transport/overnatting, valuta, bildelenker.

## Veikart (fase 2–7)

2. **Vaner:** `habits` + `habit_entries` (PK `(habit_id, done_on)`, rad =
   gjennomført); avkryssing på `/vaner`; ekte vaner erstatter mock-generatoren.
3. **Trening:** `workouts`, `exercises` (normalisert), `workout_sets`,
   view `weekly_volume`; økt-logging på `/styrke` (revurder zod her).
4. **Journal** (tidligere «notater» – navnet byttet aug. 2026, `notes` står
   ledig til et evt. udatert notat-domene): `journal_entries(written_on,
   title, body)` + skjema. Én innførsel per dag (unik `(user_id,
   written_on)`); redigering via `/journal?rediger=<id>` (oppdatering
   skjer via id, så datoflytting fungerer). Dagsvurdering 1–5 lagres som
   metrikken `day_rating` – ingen egen tabell.
   **GJENNOMFØRT aug. 2026** (migrasjoner `20260809063105_journal`,
   `20260809070743_journal_one_entry_per_day`,
   `20260809070802_day_rating_metric`).
4b. **Reiser (Memory Bank – fremskyndet på brukerens ønske):** `trips` +
   klikkbart verdenskart på `/reiser`. **GJENNOMFØRT aug. 2026**
   (migrasjon `20260816193703_trips`; se egen seksjon over).
5. **Investeringer (transaksjonsmodell – brukerens valg):** `accounts`,
   `instruments`, `account_transactions`, `instrument_prices` (eksterne
   sluttkurser; kilde velges i fasen – Yahoo Finance har intet offisielt API),
   view `portfolio_history`. Nordnet/DNB-API som senere utvidelse.
6. **Mat:** `food_items`, `meals`, `meal_items`, view `daily_nutrition`,
   ny rute `/mat`.
7. **Eksport + herding:** `export_all()`-RPC + eksport-side, restore-test,
   full advisors-gjennomgang, hosting-sjekkliste.
