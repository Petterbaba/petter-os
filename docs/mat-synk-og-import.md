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

## Importere middager fra Oda

Import skjer i en Claude-økt (Oda-integrasjonen er en MCP-server, ikke et
API appen kan kalle). Oppskriftene importeres som **egne redigerbare
kopier** – Oda er utgangspunkt, aldri lesebane. Inventaret over kandidater
(36 retter per 31. aug 2026) ligger i MAT-PLAN.md til featuren er levert.

Rutinen per rett:

1. Hent oppskriften via Oda-MCP (`recipe_search`/middagslistene).
2. Konverter mengdene til gram. **Kjent felle:** Odas middagslister
   oppgir brøker av *produktenheter* («0,3 × 500 g-pakke pasta»), ikke
   gram – pakkestørrelsen må hentes fra produktdataene.
3. Mapp hver ingrediens mot `food_items` (velg riktig variant – rå/kokt
   betyr mye for kcal). Petter godkjenner mappingen underveis.
4. Lagre med Oda-id og oppskrifts-URL som kildereferanse. Dobbeltimport
   stoppes av unik indeks per bruker («allerede importert»).

Retter utenfra Oda legges inn manuelt med «Ny middag» på `/mat` – samme
skjema, med matvaresøk per ingrediensrad.

## Handlekurv hos Oda

Kurv-fylling skjer også i Claude-økt («legg ukens handleliste i kurven» –
MCP-ens cart-verktøy tar `recipe_id` direkte for Oda-retter), aldri fra
appen. Handlelisten på `/mat` er grunnlaget.

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
