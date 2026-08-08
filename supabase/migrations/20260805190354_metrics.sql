-- metrics: lang modell for kroppsmetrikker.
-- Ny metrikk (fettprosent, skritt, hvilepuls, …) = én INSERT i metric_types,
-- ingen ny migrasjon. Presis verdi-validering (f.eks. 30–250 kg) bor i
-- server-actionen; databasen håndhever kun det generiske.

create table public.metric_types (
  key        text primary key,            -- 'weight'
  label      text not null,               -- 'Vekt'
  unit       text not null,               -- 'kg'
  created_at timestamptz not null default now()
);

alter table public.metric_types enable row level security;

-- Referansedata: alle innloggede kan lese; skriving skjer kun via migrasjoner.
create policy "metric_types_select" on public.metric_types
  for select to authenticated using (true);

insert into public.metric_types (key, label, unit)
  values ('weight', 'Vekt', 'kg')
  on conflict do nothing;

create table public.metric_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id),
  metric_key  text not null references public.metric_types (key),
  measured_on date not null,
  value       numeric(10,2) not null check (value >= 0),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, metric_key, measured_on)   -- én måling per dag; upsert-nøkkel
);

alter table public.metric_entries enable row level security;

-- RLS-malen: gjentas ordrett på alle rad-eiende tabeller i senere migrasjoner.
create policy "metric_entries_select" on public.metric_entries
  for select to authenticated using (user_id = (select auth.uid()));
create policy "metric_entries_insert" on public.metric_entries
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "metric_entries_update" on public.metric_entries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "metric_entries_delete" on public.metric_entries
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger metric_entries_updated_at
  before update on public.metric_entries
  for each row execute function public.set_updated_at();
