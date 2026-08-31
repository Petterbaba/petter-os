-- goals: mål-domenet. To slag: 'misogi' (ett årsdefinerende mål per år –
-- ~50 % sjanse for å feile, kan ikke dø; et ærlig forsøk hedres, derfor
-- utfall i stedet for fremdrift) og 'maal' (fremdriftsmål med målverdi).
-- Sporingsmodus avledes av kolonnene – aldri en egen mode-kolonne:
--   metric_key satt   → fremdrift = siste måling i metric_entries
--   count_source satt → fremdrift = telling i journal_entries/trips
--   ellers            → fremdrift = sum av goal_entries (manuell logg)
-- Fremdrift lagres ALDRI på goals – alt avledes i datalaget. Ny metrikk å
-- måle mot (f.eks. bench_1rm) = én INSERT i metric_types, null kodeendring.
-- Presis validering (tittellengde, kjente metrikknøkler, heltall for
-- telle-mål) bor i server-actionen; databasen håndhever det generiske.
-- Fremtidige utvidelser (egne migrasjoner): archived_at («gi opp uten å
-- slette»), period-felt for gjentakelse, workouts/investerings-kilder når
-- fase 3/5 lander.

create table public.goals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),  -- ingen FK mot auth.users
  kind             text not null check (kind in ('misogi','maal')),
  title            text not null check (btrim(title) <> ''),
  motivation       text,                              -- «hvorfor»
  misogi_year      smallint check (misogi_year between 2000 and 2100),
  outcome          text check (outcome in ('planlagt','forsøkt','fullført')),
  reflection       text,                              -- etterrefleksjon (misogi)
  starts_on        date,
  due_on           date,                              -- frist / planlagt misogi-dato
  target_value     numeric(12,2) check (target_value > 0),
  unit             text,                              -- kun manuell modus; auto-mål
                                                      -- avleder enhet fra kilden
  metric_key       text references public.metric_types (key),
  target_direction text check (target_direction in ('opp','ned')),
  count_source     text check (count_source in ('journal','reiser','land')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (due_on is null or starts_on is null or due_on >= starts_on),
  -- retning er kun meningsfull for metrikk-lenkede mål – og da påkrevd:
  check ((metric_key is null) = (target_direction is null)),
  -- maks én automatisk kilde:
  check (metric_key is null or count_source is null),
  -- misogi: året er identiteten (unik-indeksen under), ingen tallfremdrift:
  check (kind <> 'misogi' or (misogi_year is not null
    and target_value is null and metric_key is null and count_source is null)),
  -- maal: fremdriftsmatematikken krever målverdi og startdato;
  -- år/utfall er misogi-felter:
  check (kind <> 'maal' or (target_value is not null
    and starts_on is not null and misogi_year is null and outcome is null))
);

alter table public.goals enable row level security;

-- RLS-malen, ordrett som i metrics-migrasjonen.
create policy "goals_select" on public.goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "goals_insert" on public.goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "goals_update" on public.goals
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "goals_delete" on public.goals
  for delete to authenticated using (user_id = (select auth.uid()));

-- Maks én misogi per (bruker, år) – journal-mønsteret: 23505 oversettes
-- til en «rediger i stedet»-melding i datalaget.
create unique index goals_misogi_per_year_idx
  on public.goals (user_id, misogi_year) where kind = 'misogi';

-- Listevisningen henter egne mål nyest først.
create index goals_user_idx on public.goals (user_id, created_at desc);
-- Dekkende indeks for FK-en (performance-advisor: unindexed_foreign_keys).
create index goals_metric_key_idx on public.goals (metric_key);

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- goal_entries: manuelt loggede fremdriftsinnslag («1 bok», «20 000 kr»).
-- Flere per dag er lov (to bøker samme dag); korrigering = slett innslaget.
create table public.goal_entries (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals (id) on delete cascade,
  user_id    uuid not null default auth.uid(),  -- denormalisert (RLS uten join)
  logged_on  date not null,
  value      numeric(12,2) not null check (value > 0),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goal_entries enable row level security;

create policy "goal_entries_select" on public.goal_entries
  for select to authenticated using (user_id = (select auth.uid()));
-- Bevisst avvik fra RLS-malen: FK-sjekker omgår RLS, så uten exists-
-- sjekken kunne innslag festes til en annen brukers gjettede mål-uuid.
-- Subqueryen kjører som invoker – goals-RLS gjør den til «eget mål».
create policy "goal_entries_insert" on public.goal_entries
  for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.goals g where g.id = goal_id));
create policy "goal_entries_update" on public.goal_entries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "goal_entries_delete" on public.goal_entries
  for delete to authenticated using (user_id = (select auth.uid()));

-- Loggvisningen per mål nyest først; user-indeksen dekker samle-spørringen.
create index goal_entries_goal_idx
  on public.goal_entries (goal_id, logged_on desc);
create index goal_entries_user_idx
  on public.goal_entries (user_id, logged_on desc);

create trigger goal_entries_updated_at
  before update on public.goal_entries
  for each row execute function public.set_updated_at();
