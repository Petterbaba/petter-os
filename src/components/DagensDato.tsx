"use client";

import { useSyncExternalStore } from "react";
import { isoUkenummer } from "@/lib/format";

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
  medUke = false,
}: {
  className?: string;
  medUke?: boolean;
}) {
  const dato = useSyncExternalStore(
    () => () => {},
    hentDagensDato,
    () => null,
  );

  return (
    <span className={className}>
      {dato}
      {dato !== null && medUke && (
        <span className="text-ink-3"> · uke {isoUkenummer(new Date())}</span>
      )}
    </span>
  );
}
