-- Én innførsel per dag (brukerens valg 9. aug 2026): redigering av dagens
-- innførsel erstatter behovet for flere innførsler samme dag. Datalaget
-- bruker nøkkelen som konfliktvakt: insert på en opptatt dag gir 23505,
-- som oversettes til en vennlig «rediger i stedet»-melding.
-- Unik-indeksen dekker samtidig listespørringen (nyest først via baklengs
-- indeksskann med user_id-likhet), så den gamle ikke-unike indeksen fjernes.

alter table public.journal_entries
  add constraint journal_entries_user_day_key unique (user_id, written_on);

drop index public.journal_entries_written_on_idx;
