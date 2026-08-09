-- journal: daterte refleksjoner (wikiens «journaling», veikartets fase 4).
-- Flere innførsler per dag er tillatt – dette er en dagbok, ikke en
-- måling per dag, så ingen unik nøkkel på (user_id, written_on).
-- Presis validering (lengder o.l.) bor i server-actionen; databasen
-- håndhever kun det generiske: påkrevde felt og ikke-tomme tekster.

create table public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),   -- ingen FK mot auth.users
  written_on date not null,
  title      text not null check (btrim(title) <> ''),
  body       text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;

-- RLS-malen, ordrett som i metrics-migrasjonen.
create policy "journal_entries_select" on public.journal_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "journal_entries_insert" on public.journal_entries
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "journal_entries_update" on public.journal_entries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "journal_entries_delete" on public.journal_entries
  for delete to authenticated using (user_id = (select auth.uid()));

-- Listevisningen henter egne innførsler nyest først.
create index journal_entries_written_on_idx
  on public.journal_entries (user_id, written_on desc);

create trigger journal_entries_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();
