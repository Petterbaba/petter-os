-- Fjerner FK-en fra metric_entries.user_id til auth.users.
-- Begrunnelse (review-funn): Supabase fraråder FK-er direkte mot
-- auth-skjemaet. RLS + `default auth.uid()` gir samme integritetsgaranti,
-- FK-en blokkerte sletting av brukeren, og en pg_dump av public-skjemaet
-- blir nå selvstendig restorerbar (ingen avhengighet til auth-skjemaet).
-- Kolonnen, defaulten og alle RLS-policyer består uendret.
alter table public.metric_entries
  drop constraint metric_entries_user_id_fkey;
