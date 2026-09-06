-- dinner_ingredients: Oda-produktreferanse per ingrediens (brukerens valg
-- sep. 2026: planleggeren er primærfunksjonen og man handler hos Oda, så
-- ingrediens-søket i skjemaet går mot Oda-katalogen og treffet blir navnet;
-- næringskoblingen mot food_items er nice-to-have). KUN id-en lagres som
-- kildereferanse (oda_recipe_id-presedensen) – navnet bor i label, og
-- pris/pakkestørrelse er volatile Oda-data som aldri skal inn i DB.
alter table public.dinner_ingredients
  add column oda_product_id text;
