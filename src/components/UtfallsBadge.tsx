import type { MisogiUtfall } from "@/lib/types";

const UTFALL_ETIKETT: Record<MisogiUtfall, string> = {
  planlagt: "Planlagt",
  forsøkt: "Forsøkt",
  fullført: "Fullført",
};

// Utfalls-badge for misogier, i ink-toner (aksent brukes aldri til tekst).
// «Forsøkt» presenteres likeverdig med «Fullført» – forsøket hedres.
export function UtfallsBadge({ utfall }: { utfall: MisogiUtfall | null }) {
  if (utfall === null) {
    return null;
  }

  return (
    <span className="shrink-0 rounded-full border border-edge px-2 py-0.5 text-xs text-ink-2">
      {UTFALL_ETIKETT[utfall]}
    </span>
  );
}
