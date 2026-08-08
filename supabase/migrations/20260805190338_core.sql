-- core: delte hjelpefunksjoner for alle domener.

-- Holder updated_at à jour på alle tabeller som har kolonnen.
-- search_path låses eksplisitt (security-advisor-krav for funksjoner).
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;
