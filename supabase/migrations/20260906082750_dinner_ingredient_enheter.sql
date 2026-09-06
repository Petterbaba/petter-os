-- dinner_ingredients: mengde + enhet i stedet for rene gram. Enhetene
-- (g, kg, ml, dl, l, ss, ts, stk) velges i skjemaet; gram AVLEDES i
-- datalaget (src/lib/enheter.ts) via matvarens porsjonsvekter fra
-- Matvaretabellen («desiliter», «spiseskje», «teskje», «stk») og lagres
-- aldri. Eksisterende rader var alltid gram, så default 'g' er riktig
-- backfill. Presis enhetsliste håndheves i server-actionen
-- (databasekonvensjonen: DB håndhever kun det generiske).

alter table public.dinner_ingredients
  rename column amount_grams to amount;

-- Rename av kolonnen omdøper ikke check-constrainten (amount > 0).
alter table public.dinner_ingredients
  rename constraint dinner_ingredients_amount_grams_check
  to dinner_ingredients_amount_check;

alter table public.dinner_ingredients
  add column unit text not null default 'g' check (btrim(unit) <> '');
