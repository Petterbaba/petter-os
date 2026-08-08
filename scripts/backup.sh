#!/usr/bin/env bash
# Backup av petter-os-databasen (free tier har ingen automatiske backups).
# Kjøres med: npm run backup
# Krever SUPABASE_DB_URL i .env.local (Session pooler-URL, se .env.example)
# og pg_dump installert (macOS: brew install libpq && brew link --force libpq;
# Windows: winget install --id PostgreSQL.PostgreSQL.17 – kun commandlinetools).
#
# Dumpen dekker public-skjemaet og er selvstendig restorerbar i et nytt
# prosjekt (ingen FK-er mot auth-skjemaet). Restore: opprett prosjekt, kjør
# migrasjonene, deretter `psql "$SUPABASE_DB_URL" --file backups/<fil>.sql`
# og oppdater user_id til den nye brukerens id.
set -euo pipefail

cd "$(dirname "$0")/.."

# Leser KUN variabelen vi trenger – .env-filer er ikke shell-syntaks, så
# source ville feiltolket $/& i databasepassordet.
if [ -z "${SUPABASE_DB_URL:-}" ] && [ -f .env.local ]; then
  SUPABASE_DB_URL="$(grep -m1 '^SUPABASE_DB_URL=' .env.local | cut -d= -f2-)"
fi

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL mangler i .env.local – hent Session pooler-URL fra Supabase-dashboardet (Connect) og legg den inn}"

# Windows-installasjonen (winget/EDB) legger ikke bin-mappen på PATH –
# let i standardplasseringen og ta nyeste versjon.
if ! command -v pg_dump >/dev/null; then
  for bin in "/c/Program Files/PostgreSQL/"*/bin; do
    [ -x "$bin/pg_dump.exe" ] && PATH="$bin:$PATH"
  done
fi

command -v pg_dump >/dev/null || {
  echo "pg_dump mangler. macOS: brew install libpq && brew link --force libpq" >&2
  echo "Windows: winget install --id PostgreSQL.PostgreSQL.17" >&2
  exit 1
}

mkdir -p backups
fil="backups/petter-os-$(date +%Y%m%d-%H%M%S).sql"

pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --no-acl --file "$fil"

echo "Backup skrevet til $fil"
