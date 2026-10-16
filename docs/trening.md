# Trening (fase 3) – designdokument

Status: **utkast til godkjenning** (16. okt 2026). Ingenting er bygd eller
migrert. Dokumentet samler beslutningene fra planleggingsøkten, slik at
neste økt kan starte rett på migrasjonen når åpne spørsmål (nederst) er
besvart.

Bakgrunn: [treningsapp-og-apple-health.md](treningsapp-og-apple-health.md)
(PWA først, egen app senere ved behov).

## Beslutninger (brukerens, okt. 2026)

- **Styrke først, løping i baksetet.** Kondisjon hører til samme domene
  og datamodell, men løpemodulens UI kommer etter styrke.
- **RPE står i programmet, logges ikke per sett.** Mål-RPE per øvelse
  (gjelder siste sett) vises i økta. «Det var tungt i dag» hører til
  øktnotatet.
- **Oppvarmingssett er vanlige sett** med lettere vekt – ingen egen
  markering.
- **Programgenerering: alternativ A til å begynne med.** Appen samler
  svarene på oppstartsspørsmålene; Claude lager programmet i en Claude
  Code-økt (Supabase MCP), samme mønster som oppskriftsimporten fra Oda.
  Alternativ B (appen kaller Claude API selv) kan komme senere uten
  tabellendringer.
- **Spørsmålene stilles av appen** ved nytt program og når et program
  utløper, forhåndsutfylt med forrige svar.
- **Utseende skreddersys til petter-os:** layout og interaksjoner fra
  mockupen «Treningslogg» (claude.ai-artifact), men med petter-os sine
  tokens og begge temaer. Mockupens grønne «øk vekten»-pil får
  aksentfargen (én aksent per tema).
- **Navigasjon: undersider, ingen bunnmeny** (anbefalt, se Ruter).
- **Historikken fra Gravitus importeres** – ca. tre års logg, se Import.

## Brukerflyt

**Hver økt:**

1. `/trening` viser uke X av N i syklusen, ukestripen (fullført / i dag /
   planlagt / hvile) og kortet for dagens økt: øvelser, sett × reps og
   pil ved øvelser der vekten skal økes.
2. «Start økt» oppretter en pågående økt (overlever reload, følger
   mellom enheter – kokebok-mønsteret).
3. Øktsiden: ett kort per øvelse med kolonnene *Sett | Forrige | Kg |
   Reps | ✓*, forhåndsutfylt med foreslått vekt. Trykk på kg/reps for å
   endre (lokalt til settet hukes av). Avhuking lagrer settet og starter
   hviletimeren (ring, −15 s / +15 s, «Hopp over»). «Legg til sett»,
   «Fjern sett» (sveip eller knapp, med «Angre»), «Legg til øvelse».
   Skivekalkulator for stangøvelser. Skjermbryter (Wake Lock) som i
   kokeboken.
4. «Avslutt» → sammendrag: tid, sett, nye rekorder, endring per øvelse
   mot forrige gang, «notat til neste gang» → «Lagre økt».

**Nytt program (alternativ A):**

1. Programmet utløper (eller «Nytt program»): appen viser spørreskjemaet
   ferdig utfylt med forrige svar – mål, erfaring, dager per uke, tid per
   økt, utstyr, skader/begrensninger, ønsker.
2. Svarene lagres som et program-utkast («venter på program»).
3. I en Claude Code-økt: Claude leser utkastet og historikken (arbeids-
   vekter, e1RM-trend, oppmøte), diskuterer, og skriver programdagene og
   øvelsene inn i utkastet.
4. Utkastet blir aktivt fra startdatoen.

## Datamodell

Alle tabeller følger RLS-malen (`user_id uuid not null default
auth.uid()` + fire policyer, barnetabeller denormaliserer `user_id`, ingen
FK mot `auth.users`). **Nye tabeller etter 30. okt 2026 trenger eksplisitt
`grant select, insert, update, delete … to authenticated`** (Supabase
endrer standard-grants – sjekk changelogen før migrasjonen).

### Katalog

**`exercises`** (per bruker, arkiveres – slettes aldri)

| Kolonne | Type | Merknad |
|---|---|---|
| `name` | text | Norsk visningsnavn, unikt per bruker blant ikke-arkiverte |
| `measure` | text check | `vekt_reps` · `reps` (kroppsvekt) · `assistert` (hjelpevekt – mer kg = lettere) · `tid` · `distanse_tid` |
| `equipment` | text check | `stang` · `manualer` · `kabel` · `maskin` · `kroppsvekt` · `annet` |
| `increment_kg` | numeric null | Økningssteg ved dobbel progresjon. Standard per utstyr: stang 2,5 · manualer 2 · kabel 2,5 · maskin 5; justerbart per øvelse |
| `bar_kg` | numeric null | Stangvekt for skivekalkulatoren (20 for olympisk stang) |
| `archived_at` | timestamptz null | Katalogregelen |

**`exercise_aliases`** – `exercise_id`, `source` (`gravitus`), `name`.
Unik `(user_id, source, name)`. Flere Gravitus-navn kan peke på samme
øvelse (sammenslåing), og importen slår opp her.

**`exercise_muscles`** – `exercise_id`, `muscle` (enumerert check:
`bryst`, `lats`, `ovre_rygg`, `fremre_skulder`, `side_skulder`,
`bakre_skulder`, `biceps`, `triceps`, `quadriceps`, `hamstrings`, `sete`,
`legger`, `mage`), `role` (`primaer`/`sekundaer`). Trengs for «harde sett
per muskelgruppe per uke».

### Program (plan)

**`training_programs`**

| Kolonne | Merknad |
|---|---|
| `name` | «Høst/vinter 2026» |
| `starts_on`, `ends_on` | `ends_on` er planlagt slutt (kan dekke flere sykluser); null = utkast uten innhold ennå |
| `cycle_weeks` | 6 |
| `deload_week` | 6 (null = ingen deload) – deload-regelen (halve sett, RPE 6–7) ligger i ren logikk, ikke per uke i DB |
| `goal`, `experience`, `days_per_week`, `session_minutes`, `equipment`, `limitations`, `wishes` | Svarene på oppstartsspørsmålene – lagres per program, så det synes hva hvert program bygde på |
| `principles` | Fritekst: RPE-skala, oppvarming, pauser – vises på programsiden |

Overlappende aktive programmer avvises i action/Claude-økta (en
eksklusjonsbegrensning med `btree_gist` er oppgraderingsveien).

**`program_days`** – `program_id`, `position`, `name` («Bein»),
`planned_weekday` (1–7, null = fleksibel), `kind` (`styrke`/`lop`),
`description` («Ukens tyngste økt …»).

**`program_exercises`** – `program_day_id`, `exercise_id`, `position`,
`sets`, `rep_min`, `rep_max`, `rpe_min`, `rpe_max` (numeric(3,1); like
verdier = én RPE), `rest_min_s`, `rest_max_s`, `alternative_exercise_id`
(null – «Pull-ups eller nedtrekk»), `notes`.

Løpedagens innhold varierer med uka (uke 1 og 4 progressiv tur, 2 og 5
4×4, 3 pyramide, 6 rolig). Det får egen tabell når løpemodulen bygges
(f.eks. `program_day_variants(program_day_id, weeks smallint[], name,
description)`) – egen migrasjon.

### Logg (det som faktisk skjedde)

**`workouts`**

| Kolonne | Merknad |
|---|---|
| `performed_on` | date, norsk dato (`iDagOslo()` / UTC→Oslo ved import) |
| `started_at`, `ended_at` | timestamptz; `ended_at` null = pågående. Delvis unik `(user_id) where ended_at is null` = maks én pågående økt |
| `program_day_id` | null for frie og importerte økter |
| `title` | Fra Gravitus («Push 4xW V1»), ellers programdagens navn |
| `notes` | Øktnotat |
| `source`, `source_ref` | `app`/`gravitus`; `source_ref` = Gravitus `started_at`. Delvis unik `(user_id, source, source_ref)` gjør importen idempotent |

**`workout_exercises`** – `workout_id`, `exercise_id`, `position`,
`note`. Nivået mellom økt og sett: tilsvarer Gravitus' `group_number`, og
er der øvelsesnotater («Dropset last», «notat til neste gang») bor.

**`workout_sets`** – `workout_exercise_id`, `position`, `weight_kg`
(numeric, null for kroppsvekt), `reps`, `seconds`, `distance_m`.
**Rad = gjennomført sett** (kokebok-mønsteret): planlagte sett med
foreslått vekt lever i klienten til de hukes av. Hvilke felt som er
påkrevd avgjøres av øvelsens `measure` – valideres i actionen; DB
håndhever kun generisk `>= 0`.

### Avledet – lagres aldri

Ren logikk i `src/lib/trening.ts` (maal.ts/ernaering.ts-presedensen):

- **e1RM (Epley):** `kg × (1 + reps/30)` – samme formel som Gravitus,
  så historiske tall stemmer.
- **Dobbel progresjon:** se forrige økt med samme øvelse. Arbeidsvekt =
  tyngste vekt; settene på arbeidsvekten. Når alle disse når `rep_max`
  → foreslå `arbeidsvekt + increment_kg`, ellers samme vekt. Regelen ser
  bare på settene med tyngste vekt, så oppvarmings- og dropsett påvirker
  den ikke. `assistert` går motsatt vei (mindre hjelpevekt). `reps`:
  ved toppen foreslås «legg på vekt» eller flere reps.
- **Uke i syklusen og deload:** fra `starts_on`; i deload-uka foreslås
  halve sett (rundet opp) og RPE 6–7.
- **Rekorder, «Forrige», harde sett per muskelgruppe per uke, oppmøte
  («4 av 5 økter»).**
- Gravitus-kolonnene `one_rep_equivalent` og `is_pr` importeres ikke.

Volum beregnes først i datalaget; et `security_invoker`-view
(`weekly_volume`) er oppgraderingsveien hvis det blir tregt.

## Ruter

| Rute | Innhold |
|---|---|
| `/trening` | Knutepunkt (mockupens Hjem): syklusuke, ukestripe, dagens økt, forrige økt, kort videre til Program/Historikk/Fremgang |
| `/trening/okt/[id]` | Pågående økt, uten navigasjon – bare «Avslutt» |
| `/trening/historikk` (+ `/[id]`) | Økter gruppert per uke, filter per økttype; detalj med alle sett og rekorder |
| `/trening/fremgang` | e1RM per øvelse (flest reps for kroppsvekt), 6 uker / 3 mnd / 6 mnd, øvelsesliste med trendgraf |
| `/trening/program` | Aktivt program: periode, uke X av N, dagene med øvelser (sett × reps, RPE, pause), prinsipper, «utløper om N dager» / «Nytt program» |
| `/trening/importer` | Gravitus-import (opplasting) |

Undersidene har `SideHeader` + `TilbakeLenke` til `/trening` (må være der
– en installert PWA har ingen tilbakeknapp). `/styrke` byttes ut med
`/trening` (hjemmemenyen, dashbord-modulen; redirect fra `/styrke` i
`next.config`). Gjenstår: Program-siden og spørreskjemaet er ikke med i
mockupen og må designes.

## Ytelse: optimistisk avhuking (bevisst unntak)

- **Hele appen:** Vercel-funksjonene står trolig i standardregionen
  `iad1` (Washington) mens databasen er i Stockholm – hver spørring
  krysser Atlanteren. Sjekk `x-vercel-id` på et sidekall; bytt til `arn1`
  (Stockholm) under Settings → Functions → Function Regions eller med
  `"regions": ["arn1"]` i `vercel.json`. Gjøres før trening bygges.
- **Loggingen:** avhuking av sett bruker React 19 `useOptimistic` –
  haken og hviletimeren kommer umiddelbart, lagringen skjer i bakgrunnen,
  og ved feil ruller settet tilbake med melding. Endring av kg/reps er
  lokal til avhuking. Unntaket fra «ikke optimistisk UI» dokumenteres i
  CLAUDE.md og gjelder kun settlogging. Ingen offline-støtte.

## Import fra Gravitus

**Hente filen:** logg inn på gravitus.com i nettleseren →
gravitus.com/users/export/ → last ned CSV. Filen inneholder navn og
e-post i profilseksjonen og skal **aldri** i repoet (legg den i
gitignored `backups/gravitus/` om den lagres lokalt).

**Formatet** (én CSV med flere seksjoner, hver med egen overskriftsrad):

- `Profile` – ignoreres.
- `Workouts` – `started_at` (UTC), `duration_seconds`, `title` (kan være
  tom), `bodyweight` (tom).
- `Workout Sets` – `group_number` (øvelsens rekkefølge i økta),
  `set_number`, `seconds`, `distance_m`, `reps`, `weight` (**pund**),
  `rpe` (tom), `exercise` (engelsk navn), `workout` (koblingsnøkkel =
  `started_at` + mellomrom + tittel, `None` når tittelen mangler).
- `Workout Group Notes` – `group_number`, `note`, `workout`.
- Mal-, video- og tips-seksjonene er tomme.

**Regler:**

- Vekt: `lb × 0,45359237`, rundet til to desimaler (de fleste lander på
  hele eller kvarte kg; maskinstabler gir f.eks. 36,2).
- Sett med `reps = 0` hoppes over (planlagte sett som ikke ble tatt).
- Sett med `seconds` og uten reps → måletype `tid`.
- Sett uten vekt (pull-ups, dips, chins, hengende beinhev) → `reps`.
- «Assisted Pull-Up» → `assistert`.
- Gruppenotater → `workout_exercises.note`.
- `performed_on` = norsk dato for `started_at`; `ended_at` =
  `started_at + duration_seconds` (to økter fra 2023 mangler varighet).
- Øvelsesnavn slås opp i `exercise_aliases`; ukjente navn opprettes som
  ny øvelse med det engelske navnet og gjettet måletype, og kan døpes om
  eller slås sammen senere.
- Idempotent: eksisterende `(source='gravitus', source_ref=started_at)`
  hoppes over, så samme fil kan lastes opp flere ganger (Gravitus brukes
  parallelt til `/trening` er klar).

**Hvor:** opplasting på `/trening/importer` (server action leser filen i
minnet, lagrer ingenting av selve filen). RLS og `user_id`-defaulten gjør
jobben, det virker for alle brukere, og det passer kravet om å bare bruke
webappen. Filen er ca. 300 kB – under server actions' standardgrense på
1 MB. Alternativet (`npm run import:gravitus` med direkte DB-tilkobling)
ble valgt bort: det krever bruker-id som argument og terminal.

### Øvelsesmapping (forslag – godkjennes før import)

★ = finnes i det nåværende programmet. ⚠ = kandidat for sammenslåing,
avgjøres av brukeren.

| Gravitus | Norsk navn | Utstyr | Måletype |
|---|---|---|---|
| Bench Press | Benkpress (stang) ★ | stang | vekt_reps |
| Dumbelll Bench Press | Benkpress (manualer) – skrivefeil i kilden | manualer | vekt_reps |
| Incline Dumbbell Press | Skrå manualpress ★ | manualer | vekt_reps |
| Hammer Strength Incline Press | Skråpress (Hammer Strength) | maskin | vekt_reps |
| Pec Deck · Machine Fly · Butterfly | Pec deck ⚠ (trolig samme maskin) | maskin | vekt_reps |
| Incline Seated Cable Fly | Skrå kabelflyes | kabel | vekt_reps |
| Incline Dumbbell Fly | Skrå flyes (manualer) | manualer | vekt_reps |
| Dip | Dips | kroppsvekt | reps |
| Dumbbell Shoulder Press | Sittende skulderpress (manualer) ★ | manualer | vekt_reps |
| Shoulder Press Machine | Skulderpress (maskin) | maskin | vekt_reps |
| Hammer Strength Iso Lateral Shoulder Press | Skulderpress (Hammer Strength) | maskin | vekt_reps |
| Seated Military Press Smith Machine | Sittende skulderpress (smith) | maskin | vekt_reps |
| Overhead Press | Stående skulderpress (stang) | stang | vekt_reps |
| Arnold Press | Arnoldpress | manualer | vekt_reps |
| Dumbbell Lateral Raise | Sidehev med manualer ★ | manualer | vekt_reps |
| One Arm Cable Lateral Raise | Sidehev i kabel ★ | kabel | vekt_reps |
| Face Pull | Face pulls ★ | kabel | vekt_reps |
| Reverse Pec Deck | Omvendt flyes (maskin) | maskin | vekt_reps |
| Dumbbell Shrug | Skuldertrekk (manualer) | manualer | vekt_reps |
| Cable Rope Triceps Extensions | Triceps pushdown (tau) ★ | kabel | vekt_reps |
| Pushdown | Triceps pushdown ⚠ (stang/tau?) | kabel | vekt_reps |
| Seated Overhead Cable Tricep Rope Extension | Triceps overhead (kabel, tau) | kabel | vekt_reps |
| Dumbbell Skull Crusher | Skullcrushers (manualer) ★ | manualer | vekt_reps |
| Lat Pulldown | Nedtrekk | kabel | vekt_reps |
| Neutral Grip Lat Pulldown | Nedtrekk, nøytralt grep ★ (alternativ til pull-ups) | kabel | vekt_reps |
| Close-Grip Lat Pulldown | Nedtrekk, smalt grep ⚠ | kabel | vekt_reps |
| Wide-Grip Lat Pulldown | Nedtrekk, bredt grep ⚠ | kabel | vekt_reps |
| Omni Grip Lat Pulldown | Nedtrekk, omni-grep ⚠ | kabel | vekt_reps |
| Neutral Grip Pull-Up | Pull-ups, nøytralt grep ★ | kroppsvekt | reps |
| Chinup | Chin-ups | kroppsvekt | reps |
| Assisted Pull-Up | Assistert pull-up | maskin | assistert |
| Hammer Strength Iso-Lateral Row | Bryststøttet roing (maskin) ★ | maskin | vekt_reps |
| Chest Supported Row Machine | Bryststøttet roing, annen maskin ⚠ | maskin | vekt_reps |
| Chest Supported Row | Bryststøttet roing (benk) | manualer | vekt_reps |
| Seated Cable Row | Sittende roing (kabel) | kabel | vekt_reps |
| Close-Grip Seated Cable Row | Sittende roing, smalt grep ⚠ | kabel | vekt_reps |
| Machine Row · Machine Low Row | Roing (maskin) ⚠ | maskin | vekt_reps |
| Diverging Seated Row | Sittende roing (diverging) | maskin | vekt_reps |
| One-Arm Dumbbell Row | Enarms manualroing | manualer | vekt_reps |
| T-Bar Row | T-bar-roing | stang | vekt_reps |
| Barbell Row | Stangroing | stang | vekt_reps |
| Cable Rope Straight Arm Pull Down | Straight arm pulldown (tau) ★ | kabel | vekt_reps |
| Dumbbell Curl | Bicepscurl (manualer) | manualer | vekt_reps |
| Hammer Curl | Hammercurl ★ | manualer | vekt_reps |
| Preacher Curl Machine | Preacher curl (maskin) ★ | maskin | vekt_reps |
| Hammer Strength Seated Bicep Curl | Bicepscurl (Hammer Strength) | maskin | vekt_reps |
| Cable Biceps Curls | Bicepscurl (kabel) | kabel | vekt_reps |
| Squat | Knebøy (stang) ★ | stang | vekt_reps |
| Paused Squats | Knebøy med pause | stang | vekt_reps |
| Hack Squat | Hack squat | maskin | vekt_reps |
| Bulgarian Split Squat | Bulgarsk utfall | manualer | vekt_reps |
| Leg Press | Beinpress ★ | maskin | vekt_reps |
| Single Leg Machine Press · Single-Leg Press · Hammer Strength Leg Press Single Leg | Beinpress, ett bein ⚠ | maskin | vekt_reps |
| Leg Extension | Beinspark ★ | maskin | vekt_reps |
| Single-Leg Extension | Beinspark, ett bein | maskin | vekt_reps |
| Romanian Deadlift | Rumensk markløft ★ | stang | vekt_reps |
| Paused Barbell RDL | Rumensk markløft med pause | stang | vekt_reps |
| Deadlift | Markløft | stang | vekt_reps |
| Booty Builder | Hip thrust (maskin) | maskin | vekt_reps |
| Lying Leg Curl | Liggende lårcurl ★ | maskin | vekt_reps |
| Lying Hamstring Curl Single Leg · Single Leg Legcurl Machine | Liggende lårcurl, ett bein ⚠ | maskin | vekt_reps |
| Seated Leg Curl | Sittende lårcurl | maskin | vekt_reps |
| Seated Hip Abduction | Hofteabduksjon (maskin) | maskin | vekt_reps |
| Seated Calf Raise | Sittende tåhev | maskin | vekt_reps |
| Calf Press On Leg Press · Leg Press Toe Press | Tåhev i beinpress (samme øvelse) | maskin | vekt_reps |
| Calf Stretch | Leggstrekk | annet | tid |
| Kneeling Cable Crunch | Kabelcrunch ★ | kabel | vekt_reps |
| Abdominal Crunch Machine | Magecrunch (maskin) | maskin | vekt_reps |
| Cable Woodchopper | Vedhugger (kabel) | kabel | vekt_reps |
| Hanging Leg Raises | Hengende beinhev ⚠ (= programmets «hengende kneløft»?) | kroppsvekt | reps |
| Timed Treadmill | Løping på mølle | annet | tid |

Programøvelser uten historikk (opprettes nye): Stående tåhev, Trap
bar-markløft, Skrå benkpress (stang eller smith), Kabelflyes
(brystkryss) – og Hengende kneløft hvis den ikke er samme som
hengende beinhev.

Muskelgrupper per øvelse foreslås i implementeringsøkten.

## Rekkefølge (forslag til PR-er)

0. Vercel-region til Stockholm (uavhengig, gjøres først).
1. Migrasjon (katalog + program + logg), `database.types.ts`, domenetyper,
   datalag `src/lib/data/workouts.ts` (erstatter mocken), ren logikk i
   `src/lib/trening.ts`.
2. `/trening/importer` + import av historikken; det nåværende programmet
   legges inn i en Claude-økt (dataimport, ikke seed).
3. `/trening` + pågående økt (optimistisk avhuking, hviletimer,
   skivekalkulator, Wake Lock). `/styrke` → `/trening`.
4. Historikk + fremgang.
5. Program-siden + spørreskjemaet (alternativ A).
6. Senere: løpemodul (`program_day_variants`, logging av tid/distanse),
   Claude API (alternativ B), Apple Health.

## Åpne spørsmål

1. **Ukedag eller rekkefølge?** I uke 1 ble Push tatt mandag og Pull
   onsdag, mens programmet sier bein mandag, push tirsdag, pull torsdag.
   Forslag: programdagene har en *planlagt* ukedag, men `/trening`
   foreslår neste ugjorte økt i programmets rekkefølge og lar deg velge
   hvilken som helst programdag.
2. **Startdato** for nåværende program: mandag 12. okt 2026 (uke 1 nå)?
3. **Sammenslåinger** i mappingtabellen (⚠-radene).
4. **Hengende kneløft = hengende beinhev?**
5. **`/styrke` → `/trening`** – ok å bytte navn?
