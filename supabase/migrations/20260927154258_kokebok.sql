-- kokebok: egne oppskrifter med steg-for-steg fremgangsmåte og matlagings-
-- økter (brukerens ønske sep. 2026: «en skikkelig editor», huke av steg
-- mens man lager mat, og en timer). Kokeboken viser og redigerer de SAMME
-- middagene som ukesplanleggeren på /mat (ingen egen samling, ingen
-- kategori) – dinners utvides, og fremgangsmåten flyttes fra én tekst-
-- kolonne til en barnetabell:
--   dinners.cook_minutes / difficulty – Odas oppgitte tid og vanskelighets-
--                        grad (cookingDurationIso8601 → minutter,
--                        difficultyString → små bokstaver). Nullbare: egne
--                        retter har dem ikke nødvendigvis.
--   dinner_steps       – ett steg per rad (dinner_ingredients-malen:
--                        position + denormalisert user_id + exists-sjekk).
--                        Erstatter dinners.instructions, som backfilles
--                        her og droppes i EGEN migrasjon etter deploy:
--                        koden på Vercel leser og skriver kolonnen til
--                        pushen er ute, og previews deler produksjons-DB.
--   cooking_sessions   – én matlagingsøkt = start/stopp per (bruker,
--                        middag). Delvis unik indeks holder maks én AKTIV
--                        økt per rett (23505 → datalaget gjenopptar den).
--   cooking_session_steps – rad = steget er huket av i økten
--                        (habit_entries-prinsippet fra veikartet: raden ER
--                        faktumet). Redigering av oppskriften sletter og
--                        setter inn stegene på nytt, så avhukingene
--                        kaskaderes bort – bevisst og ærlig.
-- Varighet («tok 32 min»), «sist laget» og «laget N ganger» lagres ALDRI –
-- avledes i src/lib/matlaging.ts og datalaget (maal.ts-presedensen).
-- Presis validering (maks 50 steg à 2 000 tegn, tid 1–10 080 min) bor i
-- server-actionen; databasen håndhever det generiske.

-- --- dinners: tid og vanskelighetsgrad ------------------------------------

alter table public.dinners
  add column cook_minutes smallint check (cook_minutes > 0),
  -- Enumerert som trips.category/goals.kind. Odas sett per sep. 2026:
  -- «Lett» og «Middels» observert (81 oppskrifter), «Vanskelig» antatt.
  -- En ukjent verdi skal STOPPE importen (ny migrasjon utvider settet),
  -- aldri tolkes.
  add column difficulty text
    check (difficulty in ('lett', 'middels', 'vanskelig'));

-- --- dinner_steps -----------------------------------------------------------

create table public.dinner_steps (
  id         uuid primary key default gen_random_uuid(),
  dinner_id  uuid not null references public.dinners (id) on delete cascade,
  user_id    uuid not null default auth.uid(),  -- denormalisert (RLS uten join)
  position   smallint not null default 0,
  body       text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dinner_steps enable row level security;

create policy "dinner_steps_select" on public.dinner_steps
  for select to authenticated using (user_id = (select auth.uid()));
-- Bevisst avvik fra RLS-malen (dinner_ingredients-presedensen): FK-sjekker
-- omgår RLS, så uten exists-sjekken kunne steg festes til en annen brukers
-- gjettede middags-uuid. Subqueryen kjører som invoker – dinners-RLS gjør
-- den til «egen middag».
create policy "dinner_steps_insert" on public.dinner_steps
  for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.dinners d where d.id = dinner_id));
create policy "dinner_steps_update" on public.dinner_steps
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "dinner_steps_delete" on public.dinner_steps
  for delete to authenticated using (user_id = (select auth.uid()));

-- Stegene hentes per middag i rekkefølge; dekker også FK-en.
create index dinner_steps_dinner_idx
  on public.dinner_steps (dinner_id, position);
create index dinner_steps_user_idx
  on public.dinner_steps (user_id);

create trigger dinner_steps_updated_at
  before update on public.dinner_steps
  for each row execute function public.set_updated_at();

-- --- backfill: instructions → dinner_steps ---------------------------------
-- Dataformatet (sjekket i backup 27. sep 2026): alle 34 middager har
-- «1. Tørk …\n2. Varm …» – én linje per steg, «N. »-nummerering, ingen
-- blanke linjer (→ 152 steg). Regel: del på linjeskift, stripp
-- nummereringen, trim, dropp tomme linjer; tekst uten linjeskift blir ett
-- steg. Retter MED blanke linjer (avsnitt) deles på blank linje i stedet
-- (CASE-uttrykket), så myk linjebryting inni et avsnitt ikke blir flere
-- steg. position er 0-basert som settInnSteg i datalaget. Migrasjonen
-- kjører som eier: auth.uid() er null her, så user_id settes eksplisitt
-- fra middagen.
insert into public.dinner_steps (dinner_id, user_id, position, body)
select
  d.id,
  d.user_id,
  (row_number() over (partition by d.id order by t.nr) - 1)::smallint,
  btrim(regexp_replace(t.linje, '^\s*\d{1,3}\s*[.)]\s*', ''))
from public.dinners d
cross join lateral regexp_split_to_table(
  d.instructions,
  case when d.instructions ~ '\n\s*\n' then '\s*\n\s*\n\s*' else '\r?\n' end
) with ordinality as t(linje, nr)
where d.instructions is not null
  and btrim(regexp_replace(t.linje, '^\s*\d{1,3}\s*[.)]\s*', '')) <> '';

-- Sikring: ingen middag med tekst skal stå uten steg. raise exception
-- avbryter migrasjonen (transaksjonen rulles tilbake).
do $$
declare
  mangler integer;
begin
  select count(*) into mangler
  from public.dinners d
  where d.instructions is not null and btrim(d.instructions) <> ''
    and not exists (select 1 from public.dinner_steps s where s.dinner_id = d.id);
  if mangler > 0 then
    raise exception 'Backfill av fremgangsmåte mangler for % middag(er)', mangler;
  end if;
end
$$;

-- --- cooking_sessions -------------------------------------------------------

create table public.cooking_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),  -- ingen FK mot auth.users
  dinner_id  uuid not null references public.dinners (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at   timestamptz,  -- null = pågår
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

alter table public.cooking_sessions enable row level security;

create policy "cooking_sessions_select" on public.cooking_sessions
  for select to authenticated using (user_id = (select auth.uid()));
-- Samme exists-begrunnelse som dinner_steps.
create policy "cooking_sessions_insert" on public.cooking_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (select 1 from public.dinners d where d.id = dinner_id));
-- dinner_id endres aldri etter opprettelse (kun ended_at settes), så
-- update følger RLS-malen uten exists-sjekk (goal_entries-presedensen).
create policy "cooking_sessions_update" on public.cooking_sessions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "cooking_sessions_delete" on public.cooking_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Maks én pågående økt per (bruker, middag): 23505 → datalaget gjenopptar
-- den som finnes (journal-mønsteret, men uten feilmelding til brukeren).
create unique index cooking_sessions_active_idx
  on public.cooking_sessions (user_id, dinner_id) where ended_at is null;
-- Historikk per rett nyest først; dekker også FK-en (performance-advisor:
-- unindexed_foreign_keys).
create index cooking_sessions_dinner_idx
  on public.cooking_sessions (dinner_id, started_at desc);
-- «Sist laget» i kokebok-listen: brukerens avsluttede økter nyest først.
create index cooking_sessions_user_idx
  on public.cooking_sessions (user_id, ended_at desc);

create trigger cooking_sessions_updated_at
  before update on public.cooking_sessions
  for each row execute function public.set_updated_at();

-- --- cooking_session_steps --------------------------------------------------
-- Rad = steget er huket av i økten (habit_entries-prinsippet). Ingen
-- updated_at/trigger: raden endres aldri – den finnes eller ikke
-- (av-huking = delete).

create table public.cooking_session_steps (
  session_id uuid not null references public.cooking_sessions (id) on delete cascade,
  step_id    uuid not null references public.dinner_steps (id) on delete cascade,
  user_id    uuid not null default auth.uid(),  -- denormalisert (RLS uten join)
  done_at    timestamptz not null default now(),
  primary key (session_id, step_id)
);

alter table public.cooking_session_steps enable row level security;

create policy "cooking_session_steps_select" on public.cooking_session_steps
  for select to authenticated using (user_id = (select auth.uid()));
-- Exists-sjekken binder også steget til ØKTENS middag og krever at økten
-- pågår: et steg fra en annen oppskrift, eller en avhuking i en avsluttet
-- økt, avvises av databasen selv om actionen skulle glippe.
create policy "cooking_session_steps_insert" on public.cooking_session_steps
  for insert to authenticated
  with check (user_id = (select auth.uid())
    and exists (
      select 1
      from public.cooking_sessions s
      join public.dinner_steps st on st.dinner_id = s.dinner_id
      where s.id = session_id and st.id = step_id and s.ended_at is null));
create policy "cooking_session_steps_delete" on public.cooking_session_steps
  for delete to authenticated using (user_id = (select auth.uid()));
-- Ingen update-policy: raden oppdateres aldri.

-- PK-en dekker (session_id); FK-en step_id trenger egen indeks
-- (performance-advisor: unindexed_foreign_keys).
create index cooking_session_steps_step_idx
  on public.cooking_session_steps (step_id);
create index cooking_session_steps_user_idx
  on public.cooking_session_steps (user_id);
