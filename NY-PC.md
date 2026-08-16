# Jobbe på flere PC-er

> **Denne filen er midlertidig** – slett den (`git rm NY-PC.md`) når flyten
> sitter i fingrene. Tips: filen kan leses rett på github.com før den nye
> PC-en er satt opp.

## Mentalmodellen (push ≠ PR)

- `git push` laster branchen opp til GitHub. Derfra kan enhver maskin
  hente den. **Dette er alt som trengs for å bytte PC.**
- En **PR** flytter ingen kode – den er en forespørsel om å merge
  branchen inn i `main`, og lages først når featuren er ferdig.

```
PC 1:  commit → git push  ──→  GitHub (feat/journal)
PC 2:  git fetch → git switch feat/journal   ← samme branch, alt med
```

## Engangsoppsett på ny PC

1. **Installer verktøy:** Git (Git Credential Manager følger med) og
   Node.js (LTS).
2. **Fortell git hvem du er:**
   ```
   git config --global user.name "Petter"
   git config --global user.email "p.bergandersen@gmail.com"
   ```
3. **Klon repoet** (offentlig, så selve klonen krever ingen innlogging):
   ```
   git clone https://github.com/Petterbaba/petter-os.git
   cd petter-os
   ```
4. **GitHub-innlogging:** skjer automatisk første gang du `git push` –
   Git Credential Manager åpner nettleseren, logg inn på GitHub-kontoen,
   ferdig. (Ingen tokens å lime inn manuelt.)
5. **`.env.local`** – ligger IKKE i git (hemmeligheter). Kopier
   `.env.example` til `.env.local` og fyll inn:
   - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:
     Supabase-dashboardet → Settings → API Keys.
   - `SUPABASE_DB_URL`: kun hvis du skal kjøre `npm run backup` fra denne
     maskinen (Connect-dialogen → Session pooler; krever også pg_dump,
     se `scripts/backup.sh`).
6. **Avhengigheter og start:**
   ```
   npm install
   npm run dev
   ```
7. **Claude Code (valgfritt):** Supabase MCP autentiseres per maskin –
   `/mcp` → supabase → Authenticate.

## Daglig flyt mellom PC-ene

**Før du forlater en maskin** (ellers ligger arbeidet bare lokalt!):

```
git add .
git commit -m "..."
git push
```

**Når du setter deg ved den andre:**

```
git switch feat/journal    # første gang: git fetch først
git pull
```

Står du allerede på riktig branch, holder `git pull`.

## Når featuren er ferdig

1. PR på GitHub: `feat/journal` → `main`, «Create a merge commit».
2. Slett branchen på GitHub etter merge.
3. På BEGGE PC-er:
   ```
   git switch main
   git pull
   git branch -d feat/journal
   ```

## Vanlige feller

- **Glemt push:** jobbet på PC 1, ikke pushet, satte deg ved PC 2 og
  jobbet videre på gammel tilstand → divergerte brancher. Skjer det:
  `git pull` på branchen fletter dem (kan gi merge-konflikt du må løse).
  Vanen «alltid push før du reiser deg» forebygger hele problemet.
- **`.env.local` committes aldri** – den er gitignored med vilje; på ny
  maskin gjenskapes den fra malen, aldri via git.
- **Backup-rutinen** (`npm run backup`) trenger pg_dump + `SUPABASE_DB_URL`
  på maskinen den kjøres fra – det holder at én maskin har dette.
