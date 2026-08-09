import type { JournalEntry } from "@/lib/types";
import { formatDato } from "@/lib/format";
import { parseIsoDato, tilIsoDato } from "@/lib/dato";
import { DashboardCard } from "./DashboardCard";
import { HeatmapRutenett } from "./HeatmapRutenett";

// Binært heatmap: dag med innførsel = ett fast trinn på heat-trappen,
// tom dag = heat-0. Ingen «Mindre/Mer»-skala – det finnes bare to
// tilstander, og tittel + vurdering ligger i tooltipen.
const UKER = 26;
const NIVAA_MED_INNFORSEL = 3; // aksentfargen i trappen

export function JournalHeatmap({
  innforsler,
  til,
}: {
  innforsler: JournalEntry[];
  til: string;
}) {
  const perDag = new Map(innforsler.map((i) => [i.date, i]));

  // Perioden starter på mandagen UKER-1 uker før inneværende uke, så
  // radene i rutenettet treffer man–søn.
  const tilDato = parseIsoDato(til);
  const fraDato = new Date(tilDato);
  fraDato.setDate(
    fraDato.getDate() - ((tilDato.getDay() + 6) % 7) - (UKER - 1) * 7,
  );
  const fra = tilIsoDato(fraDato);

  // Skrivedager på rad. En dag uten innførsel ennå i dag skal ikke nulle
  // rekken – da telles det fra i går.
  const start = new Date(tilDato);
  if (!perDag.has(til)) {
    start.setDate(start.getDate() - 1);
  }
  let rekke = 0;
  for (const d = start; perDag.has(tilIsoDato(d)); d.setDate(d.getDate() - 1)) {
    rekke++;
  }

  // Antall innførsler siste 30 dager (til og med i dag).
  const tretti = new Date(tilDato);
  tretti.setDate(tretti.getDate() - 29);
  const grense = tilIsoDato(tretti);
  const sisteTretti = innforsler.filter(
    (i) => i.date >= grense && i.date <= til,
  ).length;

  return (
    <DashboardCard
      tittel="Skrivedager"
      hovedtall={`${rekke} ${rekke === 1 ? "dag" : "dager"} på rad`}
      undertekst={`${sisteTretti} ${sisteTretti === 1 ? "innførsel" : "innførsler"} siste 30 dager`}
    >
      <HeatmapRutenett
        fra={fra}
        til={til}
        nivaaForDag={(dato) =>
          perDag.has(dato) ? NIVAA_MED_INNFORSEL : 0
        }
        tittelForDag={(dato) => {
          const innforsel = perDag.get(dato);
          if (!innforsel) {
            return `Ingen innførsel · ${formatDato(dato)}`;
          }
          const vurdering =
            innforsel.rating !== undefined ? ` · ${innforsel.rating}/5` : "";
          return `${innforsel.title}${vurdering} · ${formatDato(dato)}`;
        }}
      />
    </DashboardCard>
  );
}
