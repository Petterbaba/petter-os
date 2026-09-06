-- oda_products: DELT referansedata speilet fra Odas åpne nettside-API
-- (matflyt-planen, vedtatt 6. sep 2026). food_items-presedensen: ingen
-- user_id, kun select-policy; skriving KUN via scripts/synk-oda.mjs
-- (direkte DB-tilkobling – lokalt eller GitHub Actions). Prisen er en
-- TIDSSTEMPLET CACHE (synced_at) til søkevisning og grovsortering,
-- aldri sannhet: ferske priser hentes live rett før handleforslag vises
-- (bevisst justering av regelen om flyktige Oda-data i DB).
-- Katalogregelen: borte fra kilden ved synk = arkiveres, slettes aldri.
create table public.oda_products (
  id               uuid primary key default gen_random_uuid(),
  source_id        text not null unique,  -- Odas produkt-id
  name             text not null check (btrim(name) <> ''),
  brand            text,
  name_extra       text,                  -- pakkebeskrivelse («2 stk, 375 g»)
  gross_price      numeric(10,2),         -- cache – se synced_at
  gross_unit_price numeric(10,2),         -- kr per enhet under
  unit_price_unit  text,                  -- «kg», «l», «stk»
  front_url        text,
  is_available     boolean not null default true,
  synced_at        timestamptz not null default now(),
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.oda_products enable row level security;

-- Referansedata (food_items-presedensen): alle innloggede kan lese.
-- Ingen skrivepolicyer – synkscriptet kobler til som tabelleier utenom RLS.
create policy "oda_products_select" on public.oda_products
  for select to authenticated using (true);

create trigger oda_products_updated_at
  before update on public.oda_products
  for each row execute function public.set_updated_at();

-- Autosøket sorterer treff på navn.
create index oda_products_name_idx on public.oda_products (name);
