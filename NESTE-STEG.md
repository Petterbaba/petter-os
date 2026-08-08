# Neste steg (overlevering til stasjonær PC)

> **Denne filen er midlertidig.** Når alle punktene under er gjennomført:
> slett filen og commit slettingen (`git rm NESTE-STEG.md`). Veikartet
> videre bor permanent i CLAUDE.md – dette er bare huskelisten for
> maskinbyttet og de åpne punktene per 8. august 2026.

## 1. Oppsett på ny maskin

```bash
git clone <repo-url> && cd petter-os
npm install
```

Opprett `.env.local` i roten (hemmeligheter er bevisst ikke i git).
URL og publishable key er ikke hemmelige (de ligger uansett i klient-bundelen):

```
NEXT_PUBLIC_SUPABASE_URL=https://mexwxvntjcyinesoiyvw.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_qVdpq3gmHNIjz6eX4IkdxA_Ipb7uTrp
```

Start med `npm run dev` → http://localhost:3000 → logg inn med
p.bergandersen@gmail.com + passordet fra passordmanageren.

## 2. Åpne sikkerhetspunkter (per 8. aug – gjøres i Supabase-dashboardet)

Status da denne filen ble skrevet: **signup sto fortsatt åpen** og
lekkasjebeskyttelsen var av. Sjekk/gjør under
[Authentication → Sign In / Providers](https://supabase.com/dashboard/project/mexwxvntjcyinesoiyvw/auth/providers):

- [ ] Slå av **«Allow new users to sign up»** (viktigst – proxyen slipper
      inn enhver innlogget Supabase-bruker)
- [ ] Slå på **leaked password protection** (HaveIBeenPwned-sjekk;
      security-advisor-funn)

## 3. Backup-rutine (gjøres på maskinen du utvikler fra)

- [ ] `brew install libpq && brew link --force libpq` (macOS; på annen OS:
      installer PostgreSQL-klientverktøyene for `pg_dump`)
- [ ] Hent Session pooler-tilkoblingsstreng fra dashboardet (**Connect** →
      Session pooler; sett databasepassord under Settings → Database om
      nødvendig) → legg inn som `SUPABASE_DB_URL=...` i `.env.local`
- [ ] Kjør `npm run backup` og verifiser at en `.sql`-fil dukker opp i
      `backups/`
- [ ] Rutine fremover: ukentlig + ALLTID før migrasjoner (free tier har
      ingen automatiske backups, og prosjektet auto-pauses etter ~1 ukes
      inaktivitet – logg inn i dashboardet innimellom, eller bruk appen)

## 4. Rydding

- [ ] På den gamle maskinen ligger et gitignorert `PASSORD.md` med
      app-passordet – slett den når passordet er i passordmanageren

## 5. Neste utviklingsøkt: fase 2 – Vaner

Første fase i veikartet (fullt veikart i CLAUDE.md, fase 2–7):

1. Migrasjon `habits` + `habit_entries` – følg reglene i CLAUDE.md
   («Migrasjonsflyt»): fil i `supabase/migrations/` først, MCP
   `apply_migration`, omdøp fil til skyens versjonsnummer, advisors grønn,
   regenerer `database.types.ts`. RLS-malen kopieres fra metrics-migrasjonen
   (uten FK mot auth.users). PK: `(habit_id, done_on)` – rad = gjennomført.
2. `src/lib/data/habits.ts` byttes fra mock til Supabase; de seks vanene
   opprettes som ekte rader; mock-generatoren i `src/lib/mock/habits.ts`
   slettes.
3. Avkryssing av dagens mål på `/vaner` (insert/delete + `revalidatePath`) –
   gjenbruk action-mønsteret fra `src/app/metrikker/actions.ts` og
   skjemakomponentene i `src/components/skjema/`.

Deretter (fase 3+): trening → notater → investeringer (transaksjonsmodell) →
mat → eksport/herding.

## Ferdig?

Alle bokser huket av og fase 2 levert → `git rm NESTE-STEG.md` + commit.
