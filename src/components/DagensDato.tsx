"use client";

import { useSyncExternalStore } from "react";

const datoFormat = new Intl.DateTimeFormat("nb-NO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

// Klient-snapshot slik at datoen alltid er dagens, også når siden
// prerendres statisk ved build (serveren rendrer tom span).
function hentDagensDato() {
  return datoFormat.format(new Date());
}

export function DagensDato({
  className = "text-sm text-ink-3",
}: {
  className?: string;
}) {
  const dato = useSyncExternalStore(
    () => () => {},
    hentDagensDato,
    () => null,
  );

  return <span className={className}>{dato}</span>;
}
