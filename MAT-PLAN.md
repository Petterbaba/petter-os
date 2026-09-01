# Mat: ukesplanlegger – plan og grunnlagsdata

> **Arbeidsfil for `feat/mat`-økten** (NESTE-STEG punkt 0). Opprettet
> 31. august 2026 etter API-verifisering og beslutninger i samtale.
> Slettes når featuren er levert (samme livssyklus som NESTE-STEG.md).

## Beslutninger (31. aug 2026)

1. **Middagene bor i egen database** – ikke hos Oda. Oda-oppskrifter er
   et helt greit *utgangspunkt*, men importeres som egne redigerbare
   kopier (Hardcover-prinsippet: fakta synkes inn, aldri tredjepart i
   lesebanen). Avgjørende praktisk grunn: Oda-integrasjonen er en
   MCP-server (verktøy for Claude-økter), ikke et API appen kan kalle –
   det finnes ingen holdbar lesebane fra Next.js-appen til Oda.
2. **Matvaretabellen er næringskilden** (offisiell, se under). Næring
   per porsjon beregnes alltid – aldri lagret (jf. veikartets
   `daily_nutrition`-prinsipp).
3. **Odas rolle er avgrenset**: inspirasjon/import ved oppstart og
   handlekurv-utgang når ukesplanen er lagt (MCP-ens cart-verktøy).
   Oda-URL lagres som kildereferanse på importerte retter.
4. **Scope**: ukesplanlegger (planlegging + handleliste + næring per
   porsjon). Full matlogging (`daily_nutrition`-viewet, hva som faktisk
   ble spist) er bevisst utenfor – bygges senere oppå samme grunnmur.
5. **`food_items` er DELT referansedata** (besluttet 1. sep 2026): ingen
   `user_id`, kun select-policy for innloggede (metric_types-presedensen);
   skriving skjer bare via synkscript med direkte DB-tilkobling
   (`SUPABASE_DB_URL`, som backup.sh). Egne per-bruker-matvarer er en
   fremtidig utvidelse.

## API-status (verifisert 31. aug 2026)

| Kilde | Status | Innhold |
|---|---|---|
| Oda MCP (offisiell) | OK, men **ingen næringsdata** | Produkter: pris/merke/tilgjengelighet. Oppskrifter: porsjoner, kr/porsjon, ingrediensmengder – ikke kcal. Cart-/produktliste-verktøy for handleliste. |
| `oda.com/api/v1/products/{id}/` | **Uoffisielt** (nettsidens eget), uten auth | `nutrition_info_table` per 100 g + ingredienser/allergener. Kan endres når som helst – kun til synk, aldri i lesebanen. |
| Matvaretabellen (`matvaretabellen.no/api/nb/foods.json`) | **Offisielt** (Mattilsynet), åpent, uten auth | 13 MB, 2121 matvarer. Per matvare: `calories` (kcal/100 g), `constituents` (makroer), **`portions` med gramvekt per enhet**. Ferdigretter finnes (10 taco-varianter; «Taco med tortilla, kjøttdeig, grønnsaker» = 169 kcal/100 g, 1 stk = 230 g ≈ 389 kcal). Krav: kildehenvisning. Årlig oppdatering om høsten; caching tillatt. |

**Kjent felle til importen:** mengder i Odas middagslister er brøker av
*produktenheter* («0,3 g Barilla Pasta fusilli» ≈ 0,3 × 500 g-pakke) –
konvertering til gram trenger pakkestørrelser fra produkt-API-et.

## Etappeplan

1. **Grunnmur**: **GJENNOMFØRT 1. sep 2026** – migrasjon
   `20260901164829_mat`: `food_items` (delt, jf. beslutning 5),
   `dinners` (per-bruker katalog m/`archived_at`, `oda_recipe_id` med
   delvis unik indeks mot dobbeltimport), `dinner_ingredients` (gram →
   `food_items`; teller i næring kun når både mapping og gram er satt)
   og `dinner_plans` (unik `(user_id, planned_on)` – upsert-nøkkel).
   Advisors grønne, typer regenerert.
2. **Datalag + synk**: **KODE GJENNOMFØRT 1. sep 2026** – typer i
   `types.ts` (FoodItem/Dinner/DinnerIngredient/DinnerPlan), datalag i
   `src/lib/data/mat.ts` (lesing, skriving m/opprydding, plan-upsert,
   matvaresøk; `MiddagAlleredeImportert` for 23505), ren
   næringsmatematikk i `src/lib/ernaering.ts` (naeringPerPorsjon,
   naeringsDekning, aggregerHandleliste) og synkscript
   `scripts/synk-matvaretabellen.mjs` (`npm run synk:mat`; `--dry-run`
   verifisert mot ekte API 1. sep: 2118 matvarer, 3 vitamintilskudd
   uten kcal hoppes over). **GJENSTÅR: selve synk-kjøringen** – krever
   `SUPABASE_DB_URL` i .env.local og psql (`brew install libpq`), begge
   mangler på maskinen (backup.sh har dermed heller aldri kjørt her;
   fiks samtidig).
3. **Import av middager**: skjer i Claude-økt via Oda-MCP (inventaret
   under) + vanlig skjema i appen (dialog-mønsteret fra reiser/mål) for
   retter utenfra. Ingredienser mappes mot `food_items`; Petter
   godkjenner underveis. **GJENSTÅR – krever at synken (etappe 2) er
   kjørt først.**
4. **UI `/mat`**: **GJENNOMFØRT 1. sep 2026** – `UkesplanKort` (dag-
   selecter som lagrer ved endring, ukenavigasjon `?uke=`, ukens
   næringsbilde), `MatUtforsker`/`MiddagSkjema` (dialog; ingrediensrader
   m/matvaresøk), `MiddagListe` (kcal/porsjon + dekning), 
   `HandlelisteKort`, Mattilsynet-attribusjon, `/mat` i hjemmenyen.
   Kurv-fylling hos Oda går via Claude-økt, ikke fra appen.
5. **Ferdigstilling**: **DOKUMENTASJON GJORT 1. sep 2026** (wiki-siden
   `docs/mat-synk-og-import.md`, CLAUDE.md-seksjon + veikart/ruter/
   status). Gjenstår: synk + import (over), advisors-sjekk etter
   importen, og mat-tabellene inn i fase 7-eksporten når fase 7 bygges.

## Oppskrifts-inventar fra Oda (hentet 31. aug 2026)

36 unike middager totalt: 19 likte + 29 kjøpte, hvorav 12 overlapper.

### Middagslister med KOMPLETTE data i MCP-svaret

Disse to kom med full ingrediensliste (mengder), porsjonstall og
fremgangsmåte – null skraping nødvendig:

| Liste-id | Rett |
|---|---|
| 781222 | Poke bowl med laks (2 porsjoner, 9 produkter) |
| 781220 | Marry me chicken (2 porsjoner, 9 produkter) |

### Kjernefavoritter – både likt og kjøpt (12; førsteprioritet for import)

| Oda-id | Rett |
|---|---|
| 4825 | Marry me chicken |
| 3010 | Sesamkylling med ris og brokkolini |
| 2294 | Pastapanne med kylling, bacon og spinat |
| 2769 | Rask kremet laksewok med curry og kokos |
| 2762 | Rask thai nudelsalat |
| 4211 | Rask pasta med rød pesto og mozzarella |
| 2904 | Thai laksekaker med kokos- og sukkerertris |
| 4906 | Pulled pork i piadina |
| 4533 | Krydret linsesuppe |
| 2707 | Supersalat med quinoa, grønnkål, bønner og søtpotet |
| 4985 | Grillet biff med ruccola, tomat og mozzarella |
| 3292 | Pastasalat med basilikumdressing |

### Kun likt (7)

| Oda-id | Rett |
|---|---|
| 4482 | Rask kremet pasta med salsiccia og fløte |
| 4689 | Kremet tomat- og parmesanpasta |
| 3879 | Kremet tagliatelle med laks, erter og basilikum |
| 2821 | Fiskekakeform med fløtegratinerte poteter og brokkolini |
| 2765 | Wrap med saftig kylling og kikertkrem |
| 3793 | Rask thai nudelsalat med råkost og peanøtter |
| 2116 | Jordbærsalat med kylling |

### Kun kjøpt (17)

| Oda-id | Rett |
|---|---|
| 3330 | Kremet pasta med laks og basilikum |
| 4719 | Kremet kyllingpanne med risoni |
| 2682 | Kremet tagliatelle med kylling |
| 2062 | Klassisk lasagne |
| 4037 | Rask tikka masala med kylling |
| 4257 | Rask korma med kikerter og spinat |
| 4354 | Poké bowl med laks (Silje Feiring-varianten) |
| 2257 | Poke bowl med laks (Oda-varianten) |
| 4910 | Dumplingsuppe |
| 2497 | Klassisk kjøttkakemiddag |
| 4978 | Grillet laks med agurksalat og poteter |
| 4036 | Rask salat med crispy kylling, bacon og avokado |
| 4246 | Lett wrap med falafel, avokado, hummus og feta |
| 4862 | Pinsa med spekeskinke, tomat og mozzarella |
| 4790 | «Som lady og landstrykeren, bare etter at de fikk barn» |
| 2599 | Rundstykker med linfrø *(bakst – neppe middagskandidat)* |
| 2287 | Pizzasnurrer i form *(snacks – neppe middagskandidat)* |

Oppskrifts-URL-mønster: `https://oda.com/no/recipes/<id>-<slug>/` –
MCP-ens `recipe_search`/`get_liked_recipes` gir full URL ved behov, og
`manipulate_cart` tar `recipe_id` direkte.
