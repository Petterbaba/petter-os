# Auth og brukeradministrasjon

Sist oppdatert: 2026-08-08

## Hvordan innloggingen virker

- Brukere, passord-hasher og sesjoner bor i Supabase sitt `auth`-skjema –
  ikke i `public`. I dashboardet finner du dem under **Authentication →
  Users**, ikke i Table Editor.
- Innlogging: server action i `src/app/logg-inn/actions.ts` kaller
  `signInWithPassword()`. Sesjonen lagres som cookies og fornyes automatisk
  av `src/proxy.ts` per request – derfor forblir man i praksis innlogget.
- All datatilgang går gjennom RLS: `auth.uid()` fra tokenet avgjør hvilke
  rader man ser. Hver bruker ser kun sine egne data i migrerte tabeller.
  (Mock-domener er globale og like for alle inntil de migreres.)

## Bytte passord

Innlogget bruker bytter selv på **/innstillinger** (krever dagens passord).
Nettleseren tilbyr å oppdatere lagret passord – si ja; det er
passordlagringen vår (ingen egen passordmanager).

## Glemt passord

Appen har ingen reset-flyt for uinnloggede (bevisst – e-postutsending på
free tier er upålitelig). Nødutgangen er admin-tilgangen:

1. Er du innlogget et annet sted? Bytt på /innstillinger der.
2. Ellers: sett nytt passord via Admin-API-et med service role-nøkkelen
   (Settings → API i dashboardet) – engangsoperasjon fra egen maskin;
   nøkkelen skal aldri inn i appen eller repoet.
3. **Ikke** slett og gjenopprett brukeren – ny `user_id` mister koblingen
   til alle eksisterende rader.

Databasepassordet (til `npm run backup`) resettes uavhengig av dette under
**Settings → Database** i dashboardet.

## Legge til en ny bruker (f.eks. en kollega)

Signup skal ALLTID være avslått – repoet er offentlig, og med åpen signup
kan hvem som helst opprette konto. Nye brukere opprettes manuelt:

1. [Authentication → Users](https://supabase.com/dashboard/project/mexwxvntjcyinesoiyvw/auth/users)
   → **Add user** → **Create new user** med e-post og et startpassord.
   Brukeren opprettes ferdig bekreftet; ingen e-post sendes.
2. Gi personen startpassordet; de logger inn og bytter det selv på
   /innstillinger.
3. Aldri INSERT direkte i `auth.users` – skjemaet eies av Supabase, og en
   håndskrevet rad mangler hash/identities og ødelegger auth.

## Sikkerhetsinnstillinger i dashboardet

Alt ligger på [Authentication → Sign In / Providers](https://supabase.com/dashboard/project/mexwxvntjcyinesoiyvw/auth/providers):

- **Allow new users to sign up** (under «User Signups»): AV. Slås aldri på
  igjen – brukere opprettes manuelt (se over).
- **Passordkrav**: klikk på **Email**-raden i provider-listen → panelet har
  «Minimum password length» (12+) og «Password Requirements». Strengere krav
  her gir `WeakPasswordError` ved passordbytte – /innstillinger viser da en
  generisk feilmelding, detaljer står i serverloggen.
- **Prevent use of leaked passwords** (HaveIBeenPwned): krever Pro Plan –
  ikke tilgjengelig på free tier. Security-advisoren viser derfor en
  permanent WARN om dette; den er kjent og akseptert. Kompensasjon: signup
  er av, få og håndplukkede brukere, sterke unike passord.

## Offentlig repo – hva som aldri committes

Repoet er offentlig. `.gitignore` dekker `.env*` (unntatt `.env.example`)
og `backups/`. Hemmeligheter finnes kun i `.env.local` og i
Supabase-dashboardet. URL og publishable key er ikke hemmelige (RLS er
sikkerheten), men service role-nøkkel, db-passord og app-passord skal aldri
inn i noen fil som committes – heller ikke i denne wikien.
