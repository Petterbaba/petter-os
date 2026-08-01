"use client";

import { useSyncExternalStore } from "react";

const tidFormat = new Intl.DateTimeFormat("nb-NO", {
  hour: "2-digit",
  minute: "2-digit",
});

// Tikker hvert sekund slik at minuttskiftet kommer presist.
function abonner(varsle: () => void) {
  const id = setInterval(varsle, 1000);
  return () => clearInterval(id);
}

// Klient-snapshot (serveren rendrer tomt) – samme mønster som DagensDato.
export function Klokke() {
  const tid = useSyncExternalStore(
    abonner,
    () => tidFormat.format(new Date()),
    () => null,
  );

  return <span className="tabular-nums">{tid}</span>;
}
