-- Dagsvurdering (1–5) fra journal-siden gjenbruker den lange metrics-
-- modellen: én rad i metric_types, ingen ny tabell (jf. «ny metrikk = én
-- INSERT»). Presis validering (heltall 1–5) bor i server-actionen, som for
-- vekt; DB håndhever kun generisk value >= 0.

insert into public.metric_types (key, label, unit)
  values ('day_rating', 'Dagsvurdering', '/5')
  on conflict do nothing;
