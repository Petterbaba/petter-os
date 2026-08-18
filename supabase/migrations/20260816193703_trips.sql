-- trips: reiser («Memory Bank» fase 1). Én rad per tur; landet lagres som
-- ISO 3166-1 alfa-2 (små bokstaver – matcher id-ene i verdenskart-SVG-en).
-- Landnavn, antall netter og «besøkte land» er avledet og lagres aldri.
-- Presis validering (tittellengde, kjente landkoder, datorekkefølge-
-- meldinger) bor i server-actionen; databasen håndhever det generiske.
-- Fremtidige utvidelser (egne migrasjoner): trip_stops (flere stopp per
-- tur), transport/overnatting, valuta, bildelenker.

create table public.trips (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid(),   -- ingen FK mot auth.users
  title        text not null check (btrim(title) <> ''),
  country_code text not null check (country_code ~ '^[a-z]{2}$'),
  city         text,
  started_on   date not null,
  ended_on     date not null,
  cost_nok     numeric(12,2) check (cost_nok >= 0),
  rating       smallint check (rating between 1 and 5),
  companions   text,
  category     text check (category in ('ferie','helgetur','jobb','familiebesøk','annet')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ended_on >= started_on)
);

alter table public.trips enable row level security;

-- RLS-malen, ordrett som i metrics-migrasjonen.
create policy "trips_select" on public.trips
  for select to authenticated using (user_id = (select auth.uid()));
create policy "trips_insert" on public.trips
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "trips_update" on public.trips
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "trips_delete" on public.trips
  for delete to authenticated using (user_id = (select auth.uid()));

-- Listevisningen henter egne turer nyest først; kartet teller per land.
create index trips_started_on_idx
  on public.trips (user_id, started_on desc);

create trigger trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();
