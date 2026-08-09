# Neste steg

> **Denne filen er midlertidig.** Når alle punktene under er gjennomført:
> slett filen og commit slettingen (`git rm NESTE-STEG.md`). Veikartet
> videre bor permanent i CLAUDE.md; driftsdokumentasjon i `docs/`.
> Sist oppdatert: 8. august 2026 (kveld).

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

## Rutiner (gjelder alltid)

- `npm run backup` ukentlig + ALLTID før migrasjoner
- Free tier auto-pauser etter ~1 ukes inaktivitet – daglig bruk av appen
  holder prosjektet våkent
- Feature-brancher på alt: `git switch -c feat/<navn>` FØR endringer,
  PR på GitHub, «Create a merge commit», rydd brancher etterpå

## PÅGÅENDE: journal (branch `feat/journal`, 9. august)

Gjort så langt (app-siden er ferdig, databasen står igjen):

- Migrasjonsfil skrevet: `supabase/migrations/20260809074930_journal.sql`
  (`journal_entries`, RLS-malen, indeks, updated_at-trigger). **Ikke
  applisert ennå.**
- Domenet omdøpt fra «notater» til «journal» overalt: type `JournalEntry`,
  `src/lib/data/journal.ts`, `src/lib/mock/journal.ts`, `JournalModul`,
  rute `/journal`, menypunkt, CLAUDE.md. Gamle notat-filer slettet.
  `npx tsc --noEmit` er ren.
- `.mcp.json` lagt til: Supabase MCP som prosjektavhengighet (må
  autentiseres via `/mcp` → supabase → Authenticate).

Gjenstår (krever Supabase MCP):

1. `apply_migration` med innholdet i migrasjonsfilen → omdøp filen til
   skyens versjonsnummer (`list_migrations` skal speile repoet 1:1).
2. `get_advisors` (security + performance) skal være grønn.
3. `generate_typescript_types` → oppdater `src/lib/database.types.ts`.
4. `src/lib/data/journal.ts`: mock → Supabase (`journal_entries`,
   `written_on` → domenetypens `date`, nyest først). Slett
   `src/lib/mock/journal.ts`.
5. Skjema for ny innførsel på `/journal`: server action etter mønsteret i
   `src/app/metrikker/actions.ts` (dato via `iDagOslo()`, rund-tur-validering,
   `revalidatePath` på `/journal` og `/dashbord`, `verdier` tilbake ved feil).

## Neste utviklingsøkter (revidert prioritering)

Habits (fase 2) er UTSATT – innholdet (hvilke vaner) er ikke avklart.
Modellen er triviell; den venter til vanene er bestemt.

1. **Notater** (`feat/notater`) – journaling-MVP, første nye migrasjon:
   `notes(written_on, title, body)` etter RLS-malen; `src/lib/data/notes.ts`
   fra mock til Supabase; skjema på `/notater` etter action-mønsteret.
   Husk backup først. Full migrasjonsflyt per CLAUDE.md.
2. **Reiser** (`feat/reiser`) – start på Memory Bank: én tabell
   `trips(title, country, city, started_on, ended_on, cost, rating, notes)`,
   ny rute `/reiser` + menypunkt. Bevisst minimal – kart/årsrapport senere.
3. **Vaner** – når innholdet er modent. Deretter veikartet i CLAUDE.md
   (trening, investeringer, mat, eksport/herding).

## Ferdig?

Alle bokser huket av og filen erstattet av CLAUDE.md/docs → `git rm NESTE-STEG.md`.
