-- Fiber per 100 g på food_items (Matvaretabellens nutrientId «Fiber»).
-- Nullbar som de andre makroene – ikke alle matvarer har fibertall.
-- Befolkes av synkscriptet (npm run synk:mat), aldri av appen.

alter table public.food_items
  add column fiber_per_100g numeric;
