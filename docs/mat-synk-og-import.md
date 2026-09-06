# Mat: synk og import

Driftsrutinene for mat-domenet (`/mat`): hvordan matvarekatalogen synkes
fra Matvaretabellen, og hvordan middager importeres fra Oda.
Designbeslutningene bak er dokumentert i CLAUDE.md («Mat (ukesplanlegger)»).

## Synke matvarekatalogen (food_items)

`food_items` er delt referansedata fra Matvaretabellen (Mattilsynet –
offisiell, åpen kilde). Tabellen har ingen skrivepolicyer i RLS; skriving
skjer kun via synkscriptet med direkte DB-tilkobling.

**Forutsetninger** (samme som backup):

- `SUPABASE_DB_URL` i `.env.local` – Session pooler-URL fra
  Supabase-dashboardet (Connect).
- `psql`/pg-verktøyene: macOS `brew install libpq && brew link --force libpq`.

**Kjøring:**

```bash
npm run synk:mat -- --dry-run   # last ned og valider, uten å røre DB
npm run synk:mat                # full synk
```

Synken laster ned hele katalogen (~13 MB, ~2 120 matvarer), upserter på
`source_id` (Matvaretabellens foodId) og **arkiverer** rader som er borte
fra kilden (`archived_at` – slettes aldri; kommer varen tilbake,
nullstilles arkiveringen). Matvarer uten kcal (et par vitamintilskudd)
hoppes over og listes i utskriften.

**Når:** Matvaretabellen oppdateres årlig om høsten – kjør synken da, og
alltid før en import-økt hvis katalogen er tom eller gammel.

**Kildekrav:** Mattilsynet krever kildehenvisning – `/mat`-siden viser
«Næringsdata: Matvaretabellen, Mattilsynet» og den skal bli stående.

## Synke Oda-katalogen (oda_products)

`oda_products` er delt referansedata speilet fra **Odas åpne
nettside-API** (uoffisielt, uten innlogging – åpent siden
Kolonial.no-tiden; kan endres uten varsel). Ingrediens-autosøket i
middagsskjemaet går mot denne tabellen – aldri live mot Oda. Samme
regler som food_items: ingen skrivepolicyer, skriving kun via script.

**Kjøring** (samme forutsetninger som over):

```bash
npm run synk:oda -- --dry-run   # sitemap + 20 varer, uten å røre DB
npm run synk:oda                # full synk (~6 600 varer, ~5 min)
```

Flyten: produkt-sitemapene enumererer alle id-ene → produktdata hentes
skånsomt (4 parallelle, tydelig User-Agent, retry) → upsert på
`source_id` → varer borte fra kilden arkiveres. Feiler mer enn 5 % av
oppslagene, avbrytes synken uten å skrive noe (ellers ville
arkiveringen spist varene vi ikke fikk hentet).

**Når:** nattlig via GitHub Actions
(`.github/workflows/synk-oda.yml`; secret `SUPABASE_DB_URL` må ligge i
repoets Actions-innstillinger) – og manuelt ved behov, f.eks. hvis
`/mat`-bunnteksten viser at katalogen er gammel eller tom.
«Run workflow»-knappen under Actions-fanen på GitHub kjører den også.

**NB om priser:** `gross_price`/`gross_unit_price` er en tidsstemplet
cache (`synced_at`) til søkevisning og grovsortering. Handleforslag
(fase 3) henter ferske priser live i kjøpsøyeblikket – cache-prisen er
aldri beslutningsgrunnlag alene.

## Importere middager fra Oda

Import skjer i en Claude-økt (Oda-integrasjonen er en MCP-server, ikke et
API appen kan kalle). Oppskriftene importeres som **egne redigerbare
kopier** – Oda er utgangspunkt, aldri lesebane. Inventaret over kandidater
(36 retter per 31. aug 2026) ligger i MAT-PLAN.md til featuren er levert.

Rutinen per rett:

1. Finn oppskrifts-URL-en via Oda-MCP (`recipe_search`,
   `get_liked_recipes`, `get_purchased_recipes` – disse gir kun
   metadata). Hent så selve **oppskriftssiden** (WebFetch): den gir en
   ren ingrediensliste med mengder for 4 porsjoner («400 g Kyllingfilet»,
   «2 dl Kremfløte») pluss fremgangsmåten. Det var slik importen 3. sep
   2026 ble gjort.
2. Behold oppskriftens egne enheter der appen støtter dem (sep. 2026:
   `dinner_ingredients` har `amount` + `unit` – g, kg, ml, dl, l, ss,
   ts, stk – og gram avledes av matvarens porsjonsvekter i
   `src/lib/enheter.ts`). «2 dl Kremfløte» lagres altså som 2 dl.
   Konverter til gram kun når enheten ikke støttes eller matvaren
   mangler porsjonsvekt for den (kokosmelk-boks, boil-in-bag-ris 125 g
   tørr per pose, hermetiske kikerter 240 g avrent per boks, fedd
   hvitløk 4 g). **Kjent felle:** Odas *middagslister*
   (`get_product_list`) oppgir brøker av produktenheter («0,3 × 500 g-
   pakke pasta»), ikke mengder – bruk oppskriftssiden i stedet.
3. Mapp hver ingrediens mot `food_items` (velg riktig variant – rå/kokt
   betyr mye for kcal). Petter godkjenner mappingen underveis.
4. Lagre med Oda-id og oppskrifts-URL som kildereferanse. Dobbeltimport
   stoppes av unik indeks per bruker («allerede importert»). Skriv
   antakelser og proxy-mappinger («bacon regnet som rå sideflesk»,
   «korma-saus umappet») i middagens `notes`, så de kan rettes i appen.
   Ferdigsauser (korma, tikka masala), griljermel og fersk estragon
   finnes ikke i Matvaretabellen – la dem stå umappet fremfor å gjette.
   Ved masseimport: ta `npm run backup` først og sett inn i én
   transaksjon med eksplisitt `user_id` (direkte DB-tilkobling omgår
   `auth.uid()`-defaulten).

Retter utenfra Oda legges inn manuelt med «Ny middag» på `/mat`. Nye
ingrediensrader søker i Oda-katalogen (når nettleseren er koblet til
Oda – ellers Matvaretabellen): treffet blir navnet + produktreferanse,
og et Matvaretabellen-forslag kjøres automatisk for næringskoblingen.

## Handlekurv hos Oda

**Fra appen (sep. 2026):** Oda-kortet under handlelisten på `/mat`.

1. «Koble til Oda» én gang per nettleser: appen registrerer seg som
   OAuth-klient hos Oda, du godkjenner på oda.com og sendes tilbake til
   `/mat?oda=koblet`. Tokenene ligger kryptert i en cookie (nøkkel
   `ODA_COOKIE_SECRET` i `.env.local`) – ingenting lagres i databasen.
2. «Legg i Oda-kurven» sender ukens retter som har Oda-oppskrift til
   kurven, med middagens porsjonstall. Kvitteringen har lenke til kurven;
   betaling skjer hos Oda. Retter uten Oda-oppskrift listes så du kan
   legge varene inn selv.
3. Kurven hos Oda er *relativ*: trykker du to ganger, ligger rettene der
   to ganger. Sjekk kurven før du bestiller.
4. «koble fra» sletter cookien. Utløpt eller avvist token gjør det samme
   automatisk – bare koble til på nytt.

**Fra Claude-økt (fortsatt mulig):** «legg ukens handleliste i kurven» –
MCP-ens cart-verktøy tar `recipe_id` direkte for Oda-retter. Handlelisten
på `/mat` er grunnlaget.

### Ukeshandel (pakkeøkonomi)

Rutine når ukens handleliste legges i kurven:

1. Utgangspunktet er ukens **aggregerte** handleliste
   (`aggregerHandleliste` – gram per matvare for hele uken, ikke per
   middag).
2. Velg billigste pakkekombinasjon som dekker ukens totalbehov: sammenlign
   `unitPrice` (kr/kg) fra produktsøket, og foretrekk én stor pakke
   fremfor flere små når kiloprisen er lavere (rødløk-eksempelet: én stor
   pose slår to strømper). Sjekk kampanjepriser («Maks N per kunde»-varer
   viser rabattpris i `price`, fullpris i linjetotalen).
3. Meld fra om vesentlige rester («~150 g parmesan til overs») og foreslå
   gjerne en katalogmiddag samme uke som bruker dem opp – gjelder også
   proteinet: skal uken ha kylling én gang, vurder en middag til med
   kylling så pakken brukes opp.

Fremtidig app-støtte (parkert sep. 2026): overlapp-forslag i ukesplanen,
avledet fra `dinner_ingredients` – se CLAUDE.md («Mat», fremtidige
utvidelser). Priser og pakkestørrelser skal aldri inn i databasen; de bor
her, i handleøkten.
