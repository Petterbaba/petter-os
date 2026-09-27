# Treningsapp og Apple Health (utredning)

Status: **utredning, ingenting er bygd eller endelig bestemt** (27. sep
2026). Dokumentet samler svarene fra første runde, så neste økt kan
fortsette herfra. Fakta om Apple, Supabase og tredjepartsapper er sjekket
mot kilder samme dag, i to runder (research + motbevis-forsøk). Punkter
som ikke kunne bekreftes, er merket «ubekreftet».

## Utgangspunkt

- Visjonen: petter-os er en **personlig database**. Målet er minst mulig
  friksjon, ikke et produkt.
- All trening logges i dag på mobilen, så treningsloggingen er inngangen.
  Ønske på sikt: petter-os som app i App Store. Andre brukere kan komme
  senere, men ikke nå.
- Vi antar alltid dekning på treningssenteret. **Offline-logging er ikke
  et krav.**

## Retning: webapp (PWA) først

Når det bare er én bruker, faller hovedgevinsten ved App Store bort, nemlig
at andre kan finne og laste ned appen. Derfor:

- Treningsloggingen bygges som **fase 3 i petter-os** (`/styrke`,
  `workouts`/`exercises`/`workout_sets`), mobil først, med vanlige server
  actions.
- petter-os blir installerbar fra Safari («Legg til på Hjem-skjerm»).
  Next 16 har filkonvensjonen `app/manifest.ts`, og repoet har ikke
  manifest ennå.
- Koster 0 kr, krever ingen Apple-konto og ingen bygging. Deploy skjer
  som i dag.
- Skjermen kan holdes på under økta med samme Wake Lock-teknikk som
  `SkjermBryter` i kokeboken.

**Bytt til en egen app (Expo)** først når noe av dette blir et reelt
behov:

| Behov | PWA | Egen app (Expo) |
|---|---|---|
| Varsel når hviletiden er ute og skjermen er låst | Nei, siden kjører ikke i bakgrunnen | Ja, lokalt varsel |
| Apple Health lest direkte i appen, Apple Watch | Nei | Ja |
| Logging uten dekning | Går imot server-actions-mønsteret | Mulig, må bygges |

Tabellene, RLS og datalaget overlever byttet. Bare UI-et skrives om i
React Native.

### Hvis det blir en egen app

- **Expo** (React Native + TypeScript). EAS Build bygger iOS i skyen, så
  det krever ikke Mac. Gratisnivået har 15 iOS-bygg per måned.
- **Apple Developer Program: 99 USD per år.** Kronebeløpet vises først ved
  innmelding; rundt 1 100 kr er et tredjepartsanslag (ubekreftet).
  Programmet kreves for TestFlight og for at appen skal holde seg
  installert. Gratiskontoen gir bygg som slutter å virke etter 7 dager og
  krever Xcode på Mac.
- **Distribusjon bare til seg selv:** intern TestFlight (ingen App
  Review; hvert bygg varer i 90 dager) eller direkte installasjon via EAS
  («internal distribution»).
- Appen snakker direkte med Supabase med publishable key, og RLS er
  sikkerhetsgrensen. Det bryter bevisst regelen «ingen browser-side
  Supabase-klient».
- Utgivernavn: som privatperson vises fullt navn. Via AS-et vises
  AS-navnet (krever et gratis D-U-N-S-nummer).
- Med flere brukere: felles Supabase Auth gir hver bruker egne rader via
  RLS. Adgang til petter-os skilles med et flagg i `app_metadata`
  (bare admin kan sette det, i motsetning til `user_metadata`) som sjekkes
  i `src/proxy.ts`. Treningsdata kan regnes som helseopplysninger etter
  GDPR, så da trengs personvernerklæring og kontosletting.

## Apple Health

### Grunnfakta (bekreftet)

- Apple har **ingen server-, web- eller sky-API** for helsedata.
  Helsedata i iCloud er ende-til-ende-kryptert, og Apple har ikke
  nøklene. Data kan bare leses **på iPhonen**, av en app med HealthKit
  eller av Snarveier.
- En webapp eller PWA kan aldri lese Health. petter-os kan bare
  **motta** data som telefonen sender.
- HealthKit er gratis. Kostnaden ligger i veien ut av telefonen.
- **Health kan bare leses når telefonen er låst opp.** Tilgangen
  forsvinner 10 minutter etter låsing (Apple Platform Security). Dette
  gjelder alle apper og snarveier, også betalte eksportapper.

### Tre veier inn

| Vei | Kostnad | Kommentar |
|---|---|---|
| **Snarveier** (innebygd i iOS) | 0 kr | «Finn helseprøver» (Grupper etter: Dag) + «Hent innhold i URL» (POST med JSON og egne headere) |
| **Health Auto Export** Premium | 89 kr/år, 299 kr én gang, eller 29 kr/mnd (norsk App Store 27.09.26) | Over 150 datatyper, POST rett fra telefonen til eget endepunkt, ingen leverandørsky. Samme låseskjerm-begrensning, så pengene kjøper bekvemmelighet, ikke pålitelighet. |
| **Egen app** med HealthKit | 99 USD/år | Eneste vei med riktig sammenslåing av iPhone og klokke (`HKStatisticsCollectionQuery`). Bakgrunnsoppdatering maks én gang i timen for skritt, og heller ikke mens telefonen er låst. |

**Anbefaling:** Start med Snarveier. Health Auto Export er neste steg hvis
det blir plundrete. Avvist: IFTTT/Zapier (kan ikke lese Health), Exist.io
og HealthExport Remote (leverandørsky i midten, strider mot dataeierskap).

### Snarvei-oppsettet i praksis

- **Utløser:** Ikke «klokkeslett» midt på natten, for da er telefonen
  låst og lesingen feiler. Bruk «når appen åpnes» på en app som åpnes
  hver morgen. En automasjon med klokkeslett kan kjøre uten bekreftelse,
  men bare når telefonen faktisk er låst opp.
- **Send de siste 7 dagene** hver gang. Hver dag upsertes på
  `(user_id, metric_key, measured_on)` (metrics-mønsteret), så glipp
  retter seg selv og dagens tall oppdateres utover dagen.
- **Manuelt:** Legg snarveien på hjemskjermen for å sende med ett trykk.
- **Dobbelttelling:** Med Apple Watch kan summen fra Snarveier bli høyere
  enn i Helse-appen, fordi Snarveier ikke slår sammen kildene. Kontroller
  én dag mot Helse-appen, og filtrer ev. på én kilde.
- JSON-body må være et objekt på toppnivå, ikke en array. Legg til
  `Content-Type: application/json` eksplisitt.
- Datoer: bruk den lokale datodelen (Europe/Oslo), ikke UTC. Ellers havner
  kveldsskritt på feil dag.
- Historikk bakover kan hentes én gang via Helse-appen → profil →
  «Eksporter alle helsedata» (export.xml).

### Mottaket i Supabase (skisse)

Snarveien har ingen innlogget sesjon, så `auth.uid()` er null og
RLS-defaulten for `user_id` feiler. Proxyen redirecter dessuten alle
uinnloggede requests, så en Next-route måtte unntas. Skissen omgår begge:

- **Personlig nøkkel**: tilfeldig, høy entropi, lagres som sha256-hash i
  en egen tabell, én per bruker. Kan opprettes og roteres fra
  `/innstillinger`.
- **RPC** som snarveien kaller direkte:
  `POST https://<ref>.supabase.co/rest/v1/rpc/<fn>` med **kun**
  `apikey`-header (publishable key), ingen `Authorization`-header.
  Nøkkelen sendes i body eller en egen header som `x-health-token`,
  aldri i URL-en.
- Funksjonen slår opp nøkkel-hashen, finner `user_id`, validerer
  verdiene og upserter i `metric_entries` med ny metrikk **`steps`**.
  `steps` legges til i `metric_types` via migrasjon (tabellen har bare
  select-policy).
- **Advisors grønne:** `security definer`-funksjonen legges i et
  **ikke-eksponert skjema** (`private`), med en `security invoker`-wrapper
  i `public`. Da utløses verken lint 0028 eller 0029. Begge trenger
  `set search_path = ''` (lint 0011). Anon trenger
  `grant usage on schema private`.
- **Eksplisitt `revoke execute ... from public, anon, authenticated`**
  per funksjon, deretter `grant execute ... to anon` på wrapperen. Nye
  funksjoner får EXECUTE til PUBLIC som standard, og
  `alter default privileges ... in schema` fjerner ikke det.
- Avvist: innlogging med e-post og passord fra snarveien (passord i
  klartekst, synket via iCloud), service role-nøkkelen (forbudt), og Edge
  Function (gratis, men flere bevegelige deler og ingen
  sikkerhetsgevinst).
- Bonus: daglige skrivinger holder trolig free tier-prosjektet fra å
  auto-pause. Supabase oppgir ingen eksakt terskel.

## Åpne spørsmål (neste økt)

1. **Skrittmål: daglig eller periode?** Mål med `metric_key` bruker i dag
   *siste måling*, som passer for vekt, men ikke for skritt.
   - Daglig («10 000 om dagen») hører til vaner (fase 2): en vane som
     krysses av automatisk når `steps` ≥ mål.
   - Periode («3 mill. i år») krever en ny tellemåte i `goals`: sum av
     metrikk i perioden. Pacing i «i rute»-visningen fungerer som før.
2. **Apple Watch: ja eller nei?** Svaret avgjør kildefiltreringen i
   snarveien.
3. Andre Health-data å ta med samtidig, som vekt fra smartvekt, søvn og
   hvilepuls? Hver av dem er én ny rad i `metric_types`. NB: «Grupper
   etter» summerer verdiene, så bruk Ingen + Sorter etter startdato +
   Grense 1 for ikke-kumulative typer som vekt og puls.

## Sidefunn som gjelder hele repoet

- **Supabase endrer standard-grants for eksisterende prosjekter 30. okt
  2026** ([discussions #45329](https://github.com/orgs/supabase/discussions/45329)).
  Nye **tabeller** blir ikke lenger automatisk tilgjengelige for
  anon/authenticated via Data API. Migrasjonene våre har ingen
  `GRANT`/`REVOKE` i dag, så fase 3-tabeller laget etter den datoen
  trenger `grant ... to authenticated`. Funksjoner er ikke omfattet
  (se over). Sjekk Supabase-changelogen før neste migrasjon.
- **GitHub skrur av planlagte workflows i offentlige repoer etter 60 dager
  uten aktivitet.** Nattsynken (`synk-oda.yml`) stopper da uten feilmelding,
  og med den forsvinner mye av aktiviteten som holder Supabase fra å
  pause. Den kan reaktiveres i Actions-fanen.

## Kilder (utvalg)

- HealthKit: developer.apple.com/documentation/healthkit,
  support.apple.com/102651 (iCloud-kryptering),
  support.apple.com/guide/security/sec88be9900f (Health-datavern)
- Kapabiliteter og medlemskap: developer.apple.com/help/account/reference/supported-capabilities-ios,
  developer.apple.com/support/compare-memberships
- Snarveier: support.apple.com/guide/shortcuts (Finn og filtrer,
  personlige automasjoner, «Request your first API»)
- Health Auto Export: App Store (NO) og healthyapps.dev-hjelpesidene
- Expo: docs.expo.dev/develop/development-builds/introduction
- Supabase: lint 0011/0028/0029 (splinter), api-keys-dokumentasjonen,
  pricing og limits for Edge Functions
