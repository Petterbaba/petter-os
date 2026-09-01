-- mat: ukesplanlegger (fase 6 fremskyndet – se MAT-PLAN.md for beslutningene).
-- Fire tabeller:
--   food_items         – DELT referansedata synket fra Matvaretabellen
--                        (Mattilsynet). Ingen user_id; alle innloggede leser.
--                        Skriving skjer KUN via synkscript med direkte
--                        DB-tilkobling (SUPABASE_DB_URL, som backup.sh) –
--                        metric_types-presedensen, med script i stedet for
--                        migrasjon som skrivevei.
--   dinners            – per-bruker middagskatalog. Oda-oppskrifter
--                        importeres som egne redigerbare kopier
--                        (Hardcover-prinsippet: fakta inn, aldri
--                        tredjepart i lesebanen).
--   dinner_ingredients – ingrediensrader i gram, mappes mot food_items.
--   dinner_plans       – ukesplanen: én middag per (bruker, dato).
-- Næring per porsjon lagres ALDRI – beregnes i datalaget fra gram ×
-- food_items-verdier (veikartets daily_nutrition-prinsipp). Presis
-- validering bor i server-actions; databasen håndhever det generiske.
-- Fremtidige utvidelser (egne migrasjoner): meals/meal_items (full
-- matlogging) + view daily_nutrition, egne per-bruker-matvarer.

create table public.food_items (
  id               uuid primary key default gen_random_uuid(),
  source_id        text not null unique,      -- Matvaretabellens foodId
  name             text not null check (btrim(name) <> ''),
  kcal_per_100g    numeric(6,1) not null check (kcal_per_100g >= 0),
  protein_per_100g numeric(5,1) check (protein_per_100g >= 0),
  fat_per_100g     numeric(5,1) check (fat_per_100g >= 0),
  carbs_per_100g   numeric(5,1) check (carbs_per_100g >= 0),
  portions         jsonb not null default '[]', -- [{navn, gram}] fra kilden
  archived_at      timestamptz,                 -- borte fra kilden ved synk;
                                                -- katalogregel: slettes aldri
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.food_items enable row level security;

-- Referansedata (metric_types-presedensen): alle innloggede kan lese.
-- Ingen skrivepolicyer – synkscriptet kobler til som tabelleier utenom RLS.
create policy "food_items_select" on public.food_items
  for select to authenticated using (true);

create trigger food_items_updated_at
  before update on public.food_items
  for each row execute function public.set_updated_at();

create table public.dinners (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),  -- ingen FK mot auth.users
  title         text not null check (btrim(title) <> ''),
  servings      smallint not null check (servings > 0),
  instructions  text,                              -- fremgangsmåte
  notes         text,
  oda_recipe_id text,                              -- kildereferanse ved import
  source_url    text,
  archived_at   timestamptz,  -- katalogregel: arkiveres, slettes aldri
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.dinners enable row level security;

-- RLS-malen, ordrett som i metrics-migrasjonen.
create policy "dinners_select" on public.dinners
  for select to authenticated using (user_id = (select auth.uid()));
create policy "dinners_insert" on public.dinners
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dinners_update" on public.dinners
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "dinners_delete" on public.dinners
  for delete to authenticated using (user_id = (select auth.uid()));

-- Katalogvisningen er alfabetisk per bruker.
create index dinners_user_idx on public.dinners (user_id, title);
-- Dobbeltimport av samme Oda-oppskrift gir 23505 → «allerede importert»
-- (journal-mønsteret).
create unique index dinners_oda_import_idx
  on public.dinners (user_id, oda_recipe_id) where oda_recipe_id is not null;

create trigger dinners_updated_at
  before update on public.dinners
  for each row execute function public.set_updated_at();

-- Ingrediens teller i næringsberegningen kun når BÅDE food_item_id og
-- amount_grams er satt; «salt og pepper»-rader står med bare label.
create table public.dinner_ingredients (
  id           uuid primary key default gen_random_uuid(),
  dinner_id    uuid not null references public.dinners (id) on delete cascade,
  user_id      uuid not null default auth.uid(),  -- denormalisert (RLS uten join)
  food_item_id uuid references public.food_items (id), -- null = ikke mappet ennå
  label        text not null check (btrim(label) <> ''), -- oppskriftens eget navn
  amount_grams numeric(8,1) check (amount_grams > 0),    -- null = «etter smak»
  position     smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.dinner_ingredients enable row level security;

create policy "dinner_ingredients_select" on public.dinner_ingredients
  for select to authenticated using (user_id = (select auth.uid()));
-- Bevisst avvik fra RLS-malen (goal_entries-presedensen): FK-sjekker omgår
-- RLS, så uten exists-sjekken kunne rader festes til en annen brukers
-- gjettede middags-uuid. Subqueryen kjører som invoker – dinners-RLS gjør
-- den til «egen middag».
create policy "dinner_ingredients_insert" on public.dinner_ingredients
  for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.dinners d where d.id = dinner_id));
create policy "dinner_ingredients_update" on public.dinner_ingredients
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "dinner_ingredients_delete" on public.dinner_ingredients
  for delete to authenticated using (user_id = (select auth.uid()));

-- Ingredienslisten hentes per middag i oppskriftens rekkefølge.
create index dinner_ingredients_dinner_idx
  on public.dinner_ingredients (dinner_id, position);
create index dinner_ingredients_user_idx
  on public.dinner_ingredients (user_id);
-- Dekkende indeks for FK-en (performance-advisor: unindexed_foreign_keys).
create index dinner_ingredients_food_item_idx
  on public.dinner_ingredients (food_item_id);

create trigger dinner_ingredients_updated_at
  before update on public.dinner_ingredients
  for each row execute function public.set_updated_at();

create table public.dinner_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),  -- ingen FK mot auth.users
  planned_on date not null,
  dinner_id  uuid not null references public.dinners (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, planned_on)  -- én middag per dag; upsert-nøkkel
                                -- (metrics-mønsteret: ny lagring overskriver)
);

alter table public.dinner_plans enable row level security;

create policy "dinner_plans_select" on public.dinner_plans
  for select to authenticated using (user_id = (select auth.uid()));
-- Samme exists-begrunnelse som dinner_ingredients – og i motsetning til
-- goal_entries også på update, fordi upsert-nøkkelen gjør «bytt middag på
-- en dag» til en update av dinner_id.
create policy "dinner_plans_insert" on public.dinner_plans
  for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.dinners d where d.id = dinner_id));
create policy "dinner_plans_update" on public.dinner_plans
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.dinners d where d.id = dinner_id));
create policy "dinner_plans_delete" on public.dinner_plans
  for delete to authenticated using (user_id = (select auth.uid()));

-- Ukesvisningen slår opp (user_id, planned_on) – dekket av unik-nøkkelen.
-- Dekkende indeks for FK-en (performance-advisor: unindexed_foreign_keys).
create index dinner_plans_dinner_idx on public.dinner_plans (dinner_id);

create trigger dinner_plans_updated_at
  before update on public.dinner_plans
  for each row execute function public.set_updated_at();
