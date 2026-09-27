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
- Kjøres lokalt med `npm run dev`. Hosting LIVE (6. sep 2026):
  **https://petter-os.vercel.app** på Vercel Hobby – auto-deploy ved
  push til main, preview-URL per PR (NB: previews deler
  produksjonsdatabasen). `maxDuration = 60` er satt i `mat/page.tsx`
  for kurv-actionen. Nattlig katalogsynk via GitHub Actions
  (offentlig repo = gratis; `SUPABASE_DB_URL` kun som Actions-secret,
  aldri i Vercel). Supabase Site URL skal peke på Vercel-URL-en.
  Ev. eget domene via Cloudflare-DNS senere (Petter kjenner det fra
  AS-et).

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
  `SUPABASE_DB_URL` (Session pooler) brukes kun av `scripts/backup.sh`,
  `scripts/synk-matvaretabellen.mjs` og `scripts/synk-oda.mjs` (samt som
  GitHub Actions-secret for nattsynken). Service role-nøkkelen brukes
  aldri.
  `ODA_COOKIE_SECRET` (min. 32 tegn) krypterer Oda-tilkoblings-cookien.

## Datalag (kontrakt/implementasjon-skille)

- `src/lib/types.ts` – håndskrevne camelCase-domenetyper = UI-ets kontrakt.
  Komponenter kjenner KUN disse.
- `src/lib/data/<domene>.ts` – én modul per domene (metrics, workouts,
  investments, journal, habits, trips, goals); mapper DB-rad → domenetype.
  Bytte av datakilde skjer kun her.
- `src/lib/data/dashboard.ts` – komponerer `DashboardData` med `Promise.all`.
- `src/lib/mock/<domene>.ts` – mock for domener som ikke er migrert ennå.
  Slettes per domene når det går live.
- `src/lib/database.types.ts` – GENERERT (Supabase MCP
  `generate_typescript_types` etter hver migrasjon). Importeres kun av
  datalaget, aldri av komponenter.
- Undersider henter kun sitt eget domene (`/metrikker` → `getVekt()`);
  kun `/dashbord` bruker `getDashboardData()`.
- Status: **metrics, journal, reiser (trips), mål (goals) og mat (inkl.
  kokebok) er live på Supabase**; workouts, investments, habits er
  fortsatt mock.
- Delt skjemavalidering: `src/lib/validering.ts` (`erGyldigIsoDato` –
  rund-tur-sjekken alle actions bruker – `parseNorskTall` – norsk
  komma/tusenskille; mål-skjemaet ble tredje konsument og utløste
  abstraksjonen – og `erUuid`, som kokebok- og mat-actionene og de
  dynamiske `[id]`-sidene deler; journal/mål/reiser har ennå egne kopier).

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
7. **Kolonner som koden på Vercel leser eller skriver droppes i EGEN
   migrasjon etter deploy** (lærdom sep. 2026, kokebok-migrasjonen):
   previews og produksjon deler DB, så en drop i samme migrasjon som nye
   tabeller gir 500 fra `apply_migration` til pushen er ute. Mønster:
   migrasjon 1 er additiv (+ backfill) → ny kode som ikke rører kolonnen →
   push og verifiser → migrasjon 2 dropper.

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
- Katalogtabeller (habits, accounts, exercises, food_items, dinners)
  arkiveres med `archived_at`, slettes aldri.
- Avledede tall lagres aldri – bruk views (`weekly_volume`,
  `portfolio_history`, `daily_nutrition`) eller beregn i datalaget.
- Metrics er LANG modell: `metric_types(key,label,unit)` +
  `metric_entries(metric_key, measured_on, value)`. Ny metrikk = én
  INSERT i `metric_types`, ikke ny tabell – gjelder også utover kropp
  (journalens dagsvurdering er nøkkelen `day_rating`). Presis validering
  (30–250 kg, 1–5 o.l.) bor i server-actionen; DB håndhever kun generisk
  `value >= 0`.

## Input-mønster (server actions)

- Server actions + `useActionState`; ikke API-routes (eneste unntak:
  OAuth-callbacken `/oda/callback`), ikke optimistisk UI,
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
- **To temaer, ett tokensett** (sep. 2026): hvert token i `@theme` bærer
  lys + mørk verdi via CSS `light-dark()`; `color-scheme` på `<html>`
  velger. Mørkt (svart/gull) er standard – også uten cookie; lyst tema
  er Claude-paletten (ivory `#f0eee6`/pampas-kort `#faf9f5`, varm mørk
  tekst `#3d3929`-familien, Crail-korall som aksent). `TemaKnapp`
  (øverst til høyre: i `SideHeader`, på hjemsiden og på `/logg-inn`) er
  en ren server-form som setter `tema`-cookien via `settTema` i
  `src/app/actions.ts` (målverdi i skjult felt – idempotent, ikke
  toggle); `layout.tsx` leser cookien → `data-theme` + `themeColor`
  (ingen FOUC). Kjent begrensning: andre åpne faner ser temabyttet
  først ved reload (bevisst akseptert). Delte konstanter i
  `src/lib/tema.ts`. Komponenter bruker KUN tokens – Tailwind-klasser
  eller `var(--color-*)` i recharts-props, aldri literale farger (de
  ville brutt temabyttet). NB: recharts' Tooltip-cursor har hardkodet
  `#ccc`-default – sett alltid `cursor`-prop med token.
- Tokens i `@theme static` i `globals.css`: `bg`, `card`,
  `edge`/`grid`/`axis`, `ink`/`ink-2`/`ink-3`, `accent`,
  `heat-0`–`heat-4`. `static` er påkrevd: uten den tree-shaker Tailwind
  tokens som kun refereres via `var(--color-*)` i props.
- **Én aksentfarge per tema** – mørkt rav/gull `#c98500` (5,9:1 mot
  kortflaten `#161614`), lyst Crail `#c15f3c` (4,0:1 mot `#faf9f5`;
  Claudes knappe-terrakotta `#d97757` gir bare 2,96:1 og stryker på
  markørgulvet); begge validert med dataviz-skillens validator. Tekst
  bruker ink-tonene, aldri aksent (unntak: logo-detalj). Begge
  heat-trappene er validert som ordinale ramper (rav mot lysere i mørk
  modus, Crail-korall mot mørkere i lys) – endre ikke uten å kjøre
  validatoren på nytt.
- Grafkonvensjoner: 2px linjer, arealfyll ~10 %, søyler ≤18px m/4px radius,
  hårfine gridlinjer, én serie per graf (ingen legend), tooltips overalt,
  `tabular-nums` kun på tallkolonner, runde akse-ticks.
- UI-språk: norsk (bokmål); `nb-NO`-formatering via `src/lib/format.ts`.

## Ruter

`/` hjem (klokke + meny) · `/dashbord` alt samlet · `/vaner` heatmap + radar ·
`/maal` (misogi-kort + fremdriftsmål) · `/styrke` · `/investeringer` ·
`/metrikker` (vekt-input + kurve) · `/mat` (ukesplan + middagskatalog +
handleliste) · `/kokebok` (oppskrifter; `/kokebok/ny` og
`/kokebok/[id]/rediger` = editoren, `/kokebok/[id]` = oppskrift +
matlaging – repoets første dynamiske segment) · `/journal` · `/reiser`
(klikkbart kart + skjema + liste) · `/innstillinger` (konto/passordbytte)
· `/logg-inn` (eneste uinnloggede side) · `/oda/callback` (route handler,
OAuth-retur fra Oda). Undersider bruker `SideHeader`; kokebokens
undersider har i tillegg `TilbakeLenke` (appen har ingen navbar).

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

## Mål (misogi + fremdriftsmål)

- `goals`-tabellen huser to slag (`kind`): **misogi** – ett årsdefinerende
  mål per år (Marcus Elliott / Michael Easter: ~50 % sjanse for å feile, kan
  ikke dø; et ærlig forsøk hedres) med `misogi_year`, `outcome`
  (planlagt/forsøkt/fullført) og `reflection` i stedet for tallfremdrift –
  og **maal** – fremdriftsmål med `target_value`, `starts_on`/`due_on`.
  Én misogi per år håndheves av delvis unik indeks `(user_id, misogi_year)`;
  23505 → «rediger i stedet» (journal-mønsteret). Utfall/refleksjon settes
  KUN via egen action (`settMisogiUtfall`) så redigering aldri overskriver
  dem stille.
- **Sporingsmodus avledes av kolonnene** (ingen mode-kolonne): `metric_key`
  satt → fremdrift = siste måling i `metric_entries` t.o.m. fristen
  (målinger etter `due_on` rører aldri et utløpt mål; baseline = nyeste
  måling FØR `starts_on`); `count_source` satt (journal/reiser/land) →
  telling i `journal_entries`/`trips` innenfor perioden og aldri frem i
  tid – planlagte reiser teller først fra startdato («land» = distinkte
  nye landkoder); ellers manuell → sum av `goal_entries` i perioden
  (innslag utenfor perioden avvises ved skriving; modusbytte bort fra
  manuell blokkeres når loggede innslag finnes).
  Fremdrift lagres ALDRI – alt avledes i `src/lib/data/goals.ts`; ren
  fremdriftsmatematikk (andel, pacing `forventetAndel`, `erIRute`) bor i
  `src/lib/maal.ts` (vaner-presedensen). Ny metrikk å måle mot = én INSERT
  i `metric_types`, null kodeendring.
- **Ingen gjentakelse** (brukerens valg aug. 2026): «20 000 kr/kvartal»
  modelleres som årsmål («80 000 kr i år») der «i rute»-pacingen viser
  rytmen; daglige mål hører til vaner (fase 2). Fremtidige datoer tillatt
  (mål peker fremover); fremdrifts-innslag kan ikke logges frem i tid.
- UI: `MaalUtforsker` eier én native `<dialog>` med fire skjema (mål,
  misogi, utfall, logg fremdrift – reise-mønsteret, ny key per mål);
  `MisogiKort` (hero + historikk + konsept-tom-tilstand), `MaalListe`
  (Aktive/Fullførte/Utløpte med `<details>`-rader), delt `FremdriftsBar`,
  `MaalModul` på dashbordet. Eksempelmål er kun UI-copy – aldri seedet.
- Fremtidige utvidelser (egne migrasjoner): `archived_at` («gi opp uten å
  slette»), period-felt for gjentakelse, workouts/investerings-kilder når
  fase 3/5 lander.

## Mat (ukesplanlegger)

- Fem tabeller (migrasjon `20260901164829_mat` + `20260906133958`):
  **`oda_products`** – DELT referansedata speilet fra Odas ÅPNE
  nettside-API (uoffisielt, uten auth; sitemap-enumerering, ~6 600
  varer). Ingen user_id – kun select-policy; skriving KUN via
  `npm run synk:oda` (`scripts/synk-oda.mjs`, direkte DB-tilkobling;
  `--dry-run` finnes), kjørt nattlig av GitHub Actions
  (`.github/workflows/synk-oda.yml`, secret `SUPABASE_DB_URL`).
  Prisene er TIDSSTEMPLET CACHE (`synced_at`) til søkevisning – ferske
  priser hentes live ved handleforslag (fase 3); ferskheten vises
  nederst på `/mat`. **`food_items`** – DELT
  referansedata synket fra Matvaretabellen (Mattilsynet; ~2 120 matvarer,
  verdier per 100 g + porsjonsvekter i jsonb). Ingen user_id – kun
  select-policy for innloggede; skriving KUN via `npm run synk:mat`
  (direkte DB-tilkobling som backup-scriptet; `--dry-run` finnes). Upsert
  på `source_id`; borte fra kilden = arkivert. **`dinners`** – per-bruker
  katalog (`servings`, `cook_minutes`/`difficulty` fra Odas oppskrifts-
  data, `oda_recipe_id`/`source_url` som kildereferanse); fremgangsmåten
  bor i `dinner_steps` (se Kokebok). **`dinner_ingredients`** – `amount` + `unit` (g, kg,
  ml, dl, l, ss, ts, stk; migrasjon `20260906082750`) + nullbar
  `oda_product_id` (kildereferanse fra produktsøket, migrasjon
  `20260906090642`; åpner for produktbasert kurvfylling av egne retter
  senere) + nullbar mapping
  mot food_items; enhetslisten og gram-omregningen bor i
  `src/lib/enheter.ts` (ren logikk: egen porsjonsvekt fra Matvaretabellen
  – «desiliter»/«spiseskje»/«teskje»/«stk» – foretrekkes, volum avledes
  ellers via tetthet fra en annen volumporsjon; stk krever porsjonsvekt).
  **`dinner_plans`** – én middag per (bruker, dag).
- Næring lagres ALDRI: kcal/makroer per porsjon beregnes i
  `src/lib/ernaering.ts` (maal.ts-presedensen) fra gram × verdier per
  100 g – en ingrediens teller kun når BÅDE mapping er satt OG mengden
  kan regnes om til gram via enheter.ts (dekningen «X av Y ingredienser»
  vises i UI). Handlelisten aggregeres samme sted (`aggregerHandleliste`)
  og summerer per ANGITT enhet («4 stk egg», aldri omregnet til gram –
  man handler i oppskriftens enheter).
- Upsert-nøkkel for ukesplanen: `(user_id, planned_on)` – nytt valg samme
  dag bytter middag (metrics-mønsteret; «Ingen» sletter idempotent).
  Delvis unik `(user_id, oda_recipe_id)` stopper dobbeltimport: 23505 →
  `MiddagAlleredeImportert` → «allerede importert» (journal-mønsteret).
- **Brukerens prioritering (sep. 2026): planleggeren er primærfunksjonen
  («man handler hos Oda»); næringstall er nice-to-have** – styrer alle
  UX-avveininger på `/mat`.
- Oda er kun utgangspunkt (Hardcover-prinsippet: fakta importeres som egne
  redigerbare kopier): OPPSKRIFTSimport skjer i Claude-økt via Oda-MCP –
  appen leser aldri fra Odas MCP (produktsøket gikk kortvarig dit 6. sep
  2026, men ble flyttet til lokal katalog samme dag – MCP-serveren 500-et
  for ofte). Appens ENESTE bane mot Odas MCP er SKRIVEBANEN «Legg i
  Oda-kurven» på `/mat` – appen er
  OAuth-klient mot Odas MCP-server
  (`oda.com/mcp`; dynamisk klientregistrering + PKCE, public client, ingen
  Oda-hemmelighet) og kaller `manipulate_cart` over HTTP med ukens
  `oda_recipe_id` + `servings` (`src/lib/oda/{oauth,mcp,tilkobling}.ts`).
  NB: én rett per kall – Odas server 500-er på store operasjonsbatcher
  (observert med 6 retter, sep. 2026) – og kurven leses først
  (`get_cart`) så retter som alt ligger der hoppes over: knappen er
  idempotent og dobler aldri ved nytt trykk.
  Tokens bor i en AES-GCM-kryptert httpOnly-cookie per nettleser (nøkkel
  `ODA_COOKIE_SECRET`), ALDRI i DB. `/oda/callback` er appens eneste
  route handler (OAuth krever GET-mål). Avvist token → cookie slettes →
  «Koble til Oda» igjen. Rutiner (inkl. gram-fellen i Odas mengder):
  `docs/mat-synk-og-import.md`.
- UI `/mat` (sep. 2026, HelloFresh-modellen etter brukerens ønske –
  kort som utvidet seg på stedet ble forkastet): `max-w-3xl`. Kortene
  utvider seg ALDRI – de er klikkflater som åpner én native `<dialog>`
  eid av `MatUtforsker` (to innhold: `MiddagDetalj` = hele oppskriften
  m/ tid og vanskelighet, næringstall, nummererte steg og «Legg i
  ukesplanen»-dagknapper (én form per dag; trykk på valgt dag fjerner),
  pluss lenkene «Rediger» og «Lag mat» til kokeboken; `DagVelger` =
  middagsliste m/pluss per rett for en klikket dag – valgt rett har
  minus (`SirkelIkon`; lukker ved lagring); har dagen en middag, vises
  den øverst (næring + ingredienser via delt `MiddagOversikt`) med
  «Fjern» rett under og listen som «Bytt middag»). Ny/rediger bor i
  kokeboken – «Ny middag» lenker til `/kokebok/ny` (ÉN editor, se
  Kokebok). Dialogen er `max-w-2xl`.
  `UkesplanKort` = sju dagsruter + stiplet ukessum-kort (ukenavigasjon
  via `?uke=`; faste korthøyder, fullt dagsnavn; nederst til høyre en
  minus-knapp på dager med middag som fjerner direkte uten bekreftelse,
  via delt `SirkelIkon`). Dagskortene kan DRAS til
  en annen dag (`@dnd-kit/core`, eneste UI-avhengighet utenom recharts):
  ledig dag = flytt, opptatt = bytt – avgjøres server-side i
  `flyttPlanlagtMiddag` (flytt = én UPDATE, bytt = én upsert med to rader;
  begge atomiske). Mus starter etter 6 px, touch etter langt trykk
  (250 ms) så sveip scroller; ingen tastatur-dra (dialogen dekker det).
  `UkesplanKort` har også `UkesmenyKnapp`: «Lag ukesmeny» fyller ledige
  dager, «Ny ukesmeny» (når uken er full) bytter alle sju – `lagUkesmenyAction`
  henter katalog + ukens plan + siste fire uker og lagrer i ett upsert
  (`planleggMiddager`); utvalget er ren logikk i `src/lib/ukesmeny.ts`
  (ingen gjentakelse i uken, samme proteinkilde ikke to dager på rad,
  nylig brukte retter straffes 14/28 dager, ellers tilfeldig;
  proteinkilde avledes gram-vektet av ingrediensnavn, aldri lagret); `MiddagListe` = to-kolonners kortrutenett;
  `HandlelisteKort` = ett `<details>`-kort (chevron: delt `UtvidPil`)
  sendt inn som slot. Dialogen slår middagen opp på id fra ferske props
  (aldri klikk-øyeblikksbildet). Mattilsynet-attribusjonen nederst på
  siden er et kildekrav og skal stå.
- Fremtidige utvidelser (egne migrasjoner): `meals`/`meal_items` + view
  `daily_nutrition` (full matlogging), egne per-bruker-matvarer. Uten
  migrasjon (parkert sep. 2026; tas etter middagsimporten):
  **ukesoptimalisering** – overlapp-forslag i ukesplanen (middager som
  deler ingredienser med ukens valgte, avledet fra `dinner_ingredients` –
  ernaering.ts-presedensen). Pakkeøkonomien (én stor pose fremfor to små)
  hører til handleøkten – priser/pakkestørrelser er volatile Oda-data og
  skal ALDRI inn i DB (se «Ukeshandel» i `docs/mat-synk-og-import.md`).

## Kokebok (oppskrifter + matlaging)

- **Beslutninger (brukerens, 27. sep 2026):** kokeboken viser og
  redigerer de SAMME middagene som `/mat` (ingen egen samling, ingen
  kategori); matlagingsøkter lagres i DB (overlever reload, følger
  mellom enheter, gir historikk); ÉN editor (dialogeditoren på `/mat`
  ble fjernet); Odas vanskelighetsgrad lagres ved siden av tiden;
  matlagingen skjer på oppskriftssiden selv (ingen egen kokemodus-rute);
  skjermbryteren er manuell som i Oda-appen.
- Migrasjon `20260927154258_kokebok`: `dinners.cook_minutes` (smallint
  > 0) og `difficulty` (enumerert check `lett`/`middels`/`vanskelig` –
  Odas sett; ukjent verdi skal stoppe importen, ny migrasjon utvider);
  **`dinner_steps`** (ett steg per rad, dinner_ingredients-malen;
  backfilt fra `instructions` – 152 steg i 34 middager);
  **`cooking_sessions`** (start/stopp; delvis unik `(user_id, dinner_id)
  where ended_at is null` = maks én aktiv økt per rett, 23505 →
  gjenoppta); **`cooking_session_steps`** (rad = gjort; insert-policyen
  binder steget til øktens middag og krever pågående økt). `instructions`
  står igjen ULEST til migrasjon 2 (`kokebok_drop_instructions`, etter
  deploy – se Migrasjonsflyt punkt 7). Migrasjon
  `20260927185401_kokebok_pause`: `cooking_sessions.paused_at` (satt
  mens en pause pågår) + `paused_seconds` (sum av avsluttede pauser,
  ≥ 0) + check at en avsluttet økt ikke står på pause.
- **Bare ferdige økter blir historikk** (brukerens valg 27. sep 2026):
  «Ferdig – lagre tiden» nederst under stegene eller siste avhukede steg
  lagrer; «Avbryt» øverst sletter økten (confirm); «Pause/Fortsett»
  trekker pausetid fra (varighet = slutt − start − `paused_seconds`).
  Avsluttes en økt under pause, tar `avslutningsFelter` med den
  pågående pausen. Historikkrader kan slettes (`SlettOktKnapp`, confirm)
  – økter er loggrader, ikke katalog. Ingen generell admin-side for
  sletting: data slettes der de vises (Slett*Knapp-mønsteret), og en
  «mine data»-side hører til fase 7 sammen med eksporten.
- Avledet, aldri lagret: varighet, «sist laget», «laget N ganger»
  (eksakt `count`, ikke historikklistens lengde) og neste steg – i
  `src/lib/matlaging.ts` (ren logikk: `VANSKELIGHETER`, `formatKlokke`,
  `formatVarighet`, `oppskriftMeta`, `sisteOktPerMiddag`, `nesteSteg`)
  og datalaget (`getMatlaging`, `getAvsluttedeOkter` – 1 000-økters tak
  for «sist laget»; view med `security_invoker` er oppgraderingsveien).
- **«Timeren stopper på siste steg»** avgjøres ett sted: `settStegGjort`
  i `src/lib/data/mat.ts` teller steg mot avhukinger og setter
  `ended_at` i samme kall. `ended_at`/`paused_at` klemmes til ≥
  `started_at` (`naaEtter` – DB- og Vercel-klokken kan avvike). Redigering av en
  oppskrift sletter og setter inn stegene på nytt, så avhukinger i en
  pågående økt kaskaderer bort (redigeringssiden advarer når en økt
  pågår).
- Editoren (`OppskriftSkjema`, helside): `IngrediensRader` +
  `StegRader` (opp/ned/fjern, ingen dra-og-slipp) som klient-state
  sendt som JSON i skjulte felt `ingredienser`/`steg`, validert i
  `src/app/kokebok/actions.ts` (`parseIngredienser`, `parseSteg` – tomme
  steg droppes stille; maks 50 steg à 2 000 tegn; tid 1–10 080 min).
  `nullstillNokkel`-remount mot React 19s form-reset; skjult `odaid`
  MÅ følge med (ellers nullstilles `oda_recipe_id` og Oda-kurven slutter
  å virke for retten). Vellykket lagring = `redirect` til oppskriften
  (utenfor try/catch, etter `revalidatePath`). Arkivering
  (`ArkiverOppskriftKnapp`, confirm) bruker `arkiverMiddag` – katalog-
  regelen: arkiveres, slettes aldri.
- Ingrediensrader starter i SØKEMODUS (sep. 2026 – fjernet
  dobbeltarbeidet navn + kobling): AUTOSØK (`src/lib/useAutosok.ts`:
  debounce ~300 ms, ingen søkeknapp, ref-teller forkaster utdaterte
  svar) mot den LOKALE `oda_products`-katalogen; treffet blir navnet +
  `oda_product_id`, og Matvaretabellen-søket kjøres så automatisk på et
  brand-strippet forslag fra produktnavnet slik at næringskoblingen bare
  er ett klikk (og lett å ignorere). «Bruk som navn uten kobling»-
  utveien dekker det katalogene ikke har; navngitte rader viser
  redigerbart navnefelt + mengde + enhet-select med koblingene under.
  Modusen er eksplisitt radstate (`navngitt`), aldri avledet av
  teksten. Matvaresøket viser kcal OG protein per 100 g per treff.
- Matlagingen (`Matlaging`, klient; ingredienser som server-slot mellom
  timer og steg): uten økt «Start matlaging» + les-kun steg; med økt et
  kompakt `sticky` timerkort (`OktTimer` = `useSyncExternalStore` med
  ETT delt sekund-lager som kun oppdateres i abonnementet – Klokke-
  varianten; står stille under pause via `sekunderBrukt`; «––:––» før
  hydrering; INGEN live-region på tallet) med Pause/Fortsett, Avbryt og
  `SkjermBryter` (Screen Wake Lock, av som standard, bes om på nytt ved
  `visibilitychange`, slippes ved cleanup; uten støtte grået ut).
  Knappene er én felles `OktKnapp` (liten form per økt-action). Hvert
  steg (`OktSteg`) er et eget kort med luft imellom (neste steg har
  aksentkant); HELE kortet er en `role="checkbox"`-knapp med fokusringen
  innenfor kortet; `gjort`-feltet er målverdien (idempotent, aldri
  toggle); alle knapper bruker `aria-busy` + onClick-vakt, ALDRI
  `disabled` (flytter fokus til body – LagreKnappAnimert-regelen). Neste
  steg: `aria-current="step"` + «Neste»-etikett utenfor knappen.
  Mattilsynet-attribusjonen står på oppskriftssiden.
- Next 16: `params` er en Promise; ugyldig/ukjent uuid → `notFound()`;
  `revalidatePath` med bokstavelige `/kokebok/<id>`-stier. Økt-skjemaene
  sender middagens id kun for revalidering – serveren avgjør alt annet.
- Fremtidige utvidelser: timer per steg, porsjonsskalering, avhuking av
  ingredienser («mise en place»), lim-inn-flere-steg, dra-og-slipp av
  steg (`@dnd-kit` finnes).

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
4c. **Mål (misogi + fremdriftsmål – fremskyndet på brukerens ønske):**
   `goals` + `goal_entries` på `/maal`; se egen seksjon over.
   **GJENNOMFØRT aug. 2026** (migrasjon `20260826093446_goals`).
5. **Investeringer (transaksjonsmodell – brukerens valg):** `accounts`,
   `instruments`, `account_transactions`, `instrument_prices` (eksterne
   sluttkurser; kilde velges i fasen – Yahoo Finance har intet offisielt API),
   view `portfolio_history`. Nordnet/DNB-API som senere utvidelse.
6. **Mat (fremskyndet som ukesplanlegger på brukerens ønske):**
   `food_items`, `dinners`, `dinner_ingredients`, `dinner_plans` på `/mat`;
   se egen seksjon over. **GJENNOMFØRT sep. 2026** (migrasjon
   `20260901164829_mat`; synk kjørt 1. sep; 34 Oda-oppskrifter
   importert 3. sep – umappede/antatte ingredienser står i hver
   middags `notes`). Full matlogging (`meals`, `meal_items`, view
   `daily_nutrition`) bygges senere oppå samme grunnmur.
6b. **Kokebok (fremskyndet på brukerens ønske):** `dinner_steps`,
   `cooking_sessions`, `cooking_session_steps` + tid/vanskelighet på
   `dinners`; editor og matlaging på `/kokebok`; se egen seksjon over.
   Migrasjoner `20260927154258_kokebok` og `20260927185401_kokebok_pause`
   applisert 27. sep 2026. Gjenstår:
   migrasjon 2 (`kokebok_drop_instructions`) etter deploy, og backfill av
   `cook_minutes`/`difficulty` for de 34 Oda-rettene
   (`docs/mat-synk-og-import.md`).
7. **Eksport + herding:** `export_all()`-RPC + eksport-side, restore-test,
   full advisors-gjennomgang, hosting-sjekkliste.
