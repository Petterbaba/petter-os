-- kokebok_pause: pause i matlagingsøkter (brukerens ønske 27. sep 2026 –
-- «Start, Pause, Avbryt» øverst og «Ferdig» nederst; bare ferdige økter
-- lagres i historikken, avbrutte slettes). Pausetiden trekkes fra
-- varigheten, som fortsatt avledes og aldri lagres:
--   varighet = (ended_at − started_at) − paused_seconds
--   paused_at      – satt mens en pause pågår (null = økten går).
--   paused_seconds – summen av AVSLUTTEDE pauser. Når økten fortsetter
--                    eller avsluttes under pause, legges den pågående
--                    pausen til her og paused_at nullstilles (datalaget).
-- Rent tillegg: ingen kode på Vercel leser cooking_sessions ennå, så
-- migrasjonen kan appliseres før deploy (Migrasjonsflyt punkt 7).

alter table public.cooking_sessions
  add column paused_at      timestamptz,
  add column paused_seconds integer not null default 0
    check (paused_seconds >= 0),
  -- En avsluttet økt kan ikke stå på pause: avslutningen tar med seg den
  -- pågående pausen (datalaget), og databasen håndhever at det skjer.
  add constraint cooking_sessions_pause_kun_aktiv
    check (paused_at is null or ended_at is null);
