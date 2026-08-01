@AGENTS.md

# petter-os

Personlig dashbord («personal operating system») for én bruker: Petter. Tracker
styrketrening, investeringer, kroppsmetrikker og notater/refleksjoner. Privat
prosjekt og samtidig et læringsprosjekt for stacken – gjør ting riktig, ikke
bare raskt. Dette er v0.1: enkelt, men fundamentet skal tåle å vokse.

**Kjerneprinsipp: dataeierskap.** Alle data skal kunne eksporteres. Ingen
innlåsing i tredjepartsformater.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 (CSS-first config i
  `src/app/globals.css`, ingen tailwind.config)
- Grafer: recharts (eneste UI-avhengighet utover scaffold – ikke legg til flere
  biblioteker uten god grunn)
- Database: Supabase i **eu-north-1** – ikke koblet på ennå (se «Neste økter»)
- Kjøres lokalt med `npm run dev`; hosting er ikke besluttet

## Viktig: git

**Brukeren håndterer all git selv (læringsformål). Kjør ALDRI git-kommandoer**
– ikke init, add, commit, push eller noe annet som endrer git-tilstand.

## Designvalg

- Mørkt, rolig «personlig kontrollrom» – cockpit, ikke SaaS-salgsside. Ingen
  nav, ingen CTA-er, ingen støy. Mobil først (én kolonne, `md:` to kolonner).
- Kun mørkt tema i v0.1. Tokens er definert i `@theme` i `globals.css`:
  `bg` (side), `card` (kort), `edge`/`grid`/`axis` (streker), `ink`/`ink-2`/
  `ink-3` (teksthierarki), `accent`.
- **Én aksentfarge: rav/gull `#c98500`** – validert mot kortflaten `#161614`
  med dataviz-skillens validator. Brukes til grafmerker og små detaljer.
  Tekst bruker alltid ink-tonene, aldri aksentfargen (unntak: liten detalj i
  logoen).
- Grafkonvensjoner (fra dataviz-skillen): 2px linjer, arealfyll ~10 % opasitet,
  søyler ≤18px med 4px avrundet topp, hårfine gridlinjer, én serie per graf
  (ingen legend), tooltips på alle grafer, `tabular-nums` kun på tallkolonner.
- UI-språk: norsk (bokmål). Tall og datoer formateres med `nb-NO`
  (hjelpere i `src/lib/format.ts`).

## Arkitektur og konvensjoner

- `src/app/page.tsx` er server component og henter data via
  `getDashboardData()` fra `src/lib/mockdata.ts`; modulene får data som props.
- Graf-moduler er client components (`"use client"` – recharts krever det);
  `NotatModul` og `DashboardCard` er server-kompatible.
- **Mock-data:** all data er hardkodet i `src/lib/mockdata.ts`. Typene der
  speiler den planlagte datamodellen. Når Supabase kobles på, byttes innmaten
  i `getDashboardData()` – signatur, typer og komponenter skal ikke endres.
- Delt kort-ramme: `src/components/DashboardCard.tsx`. Delt tooltip:
  `src/components/ChartTooltip.tsx`.

## Planlagt datamodell (Supabase – ikke implementert)

- `workouts` – id, date, name, duration_min
- `sets` – id, workout_id → workouts, exercise, set_number, weight_kg, reps
- `accounts` – id, name (kontoer: ASK, IPS, …)
- `transactions` – id, account_id → accounts, date, amount_nok, type
- `metrics` – id, date, weight_kg (utvides med flere kroppsmetrikker)
- `notes` – id, date, title, body

## Neste økter (plan)

1. Supabase-prosjekt (eu-north-1), skjema som migrations (ikke ad hoc-SQL),
   RLS-policyer for én bruker, generere TypeScript-typer
2. Backup-/eksportstrategi (dataeierskap)
3. Bytte mock-data mot ekte spørringer, deretter skjemaer for innlegging
