-- Dekkende indeks for fremmednøkkelen metric_entries.metric_key
-- (performance-advisor: unindexed_foreign_keys).
create index metric_entries_metric_key_idx
  on public.metric_entries (metric_key);
