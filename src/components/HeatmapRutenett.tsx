import { dagerIPeriode, parseIsoDato } from "@/lib/dato";

// Delt presentasjon for kalender-heatmap (vaner, journal): uker som
// kolonner fra mandag, månedsetiketter der ny måned begynner, valgfri
// «Mindre … Mer»-skala. Rutenettet er heldekkende – ukene deler
// kortbredden likt og cellene holder seg kvadratiske (aspect-square),
// så størrelsen skalerer med skjermen i stedet for å scrolle.
// Domenene leverer nivå (0–4 → heat-trappen) og tooltip-innhold per dag;
// `fra` bør være en mandag for at radene skal treffe man–søn.
type HeatmapRutenettProps = {
  fra: string;
  til: string;
  nivaaForDag: (dato: string) => number;
  tooltipForDag: (dato: string) => React.ReactNode;
  visSkala?: boolean;
};

const GAP_PX = 3;
const ETIKETT_BREDDE_PX = 23;

// Tailwind trenger klassenavnene fullt utskrevet for å generere dem.
const nivaaKlasser = [
  "bg-heat-0",
  "bg-heat-1",
  "bg-heat-2",
  "bg-heat-3",
  "bg-heat-4",
];

const mndFormat = new Intl.DateTimeFormat("nb-NO", { month: "short" });

function storForbokstav(tekst: string): string {
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}

export function HeatmapRutenett({
  fra,
  til,
  nivaaForDag,
  tooltipForDag,
  visSkala = false,
}: HeatmapRutenettProps) {
  const dager = dagerIPeriode(fra, til);
  const uker: string[][] = [];
  for (let i = 0; i < dager.length; i += 7) {
    uker.push(dager.slice(i, i + 7));
  }

  // Månedsetikett på ukene der en ny måned begynner.
  const mndEtiketter = uker.map((uke, i) => {
    const mandag = parseIsoDato(uke[0]);
    if (i === 0) return null; // kan stå midt i en måned – dropp etiketten
    const forrigeMandag = parseIsoDato(uker[i - 1][0]);
    return mandag.getMonth() !== forrigeMandag.getMonth()
      ? storForbokstav(mndFormat.format(mandag).replace(".", ""))
      : null;
  });

  // aria-hidden: cellene formidler kun via hover-tooltips (ikke nåbare
  // med tastatur/skjermleser) – tallene finnes i kort-headeren og
  // listene, så rutenettet er ren pynt for hjelpemidler.
  return (
    <div aria-hidden="true">
      <div
        className="relative mb-1 h-4 text-[10px] text-ink-3"
        style={{ marginLeft: ETIKETT_BREDDE_PX + GAP_PX }}
      >
        {mndEtiketter.map(
          (etikett, i) =>
            etikett && (
              <span
                key={i}
                className="absolute"
                style={{ left: `${(i / uker.length) * 100}%` }}
              >
                {etikett}
              </span>
            ),
        )}
      </div>
      <div className="flex items-stretch" style={{ gap: GAP_PX }}>
        <div
          className="grid shrink-0 pr-1 text-right text-[10px] text-ink-3"
          style={{
            width: ETIKETT_BREDDE_PX,
            gridTemplateRows: "repeat(7, 1fr)",
            gap: GAP_PX,
          }}
        >
          <span className="self-center">Man</span>
          <span />
          <span className="self-center">Ons</span>
          <span />
          <span className="self-center">Fre</span>
        </div>
        <div className="flex min-w-0 flex-1" style={{ gap: GAP_PX }}>
          {uker.map((uke, ukeIndeks) => (
            <div
              key={ukeIndeks}
              className="grid min-w-0 flex-1 content-start"
              style={{ gap: GAP_PX }}
            >
              {uke.map((dato) => (
                <span
                  key={dato}
                  className={`group relative aspect-square w-full rounded-[3px] transition-shadow hover:ring-1 hover:ring-axis ${nivaaKlasser[nivaaForDag(dato)]}`}
                >
                  {/* Egendesignet hover-tooltip i appens tokens (erstatter
                      nettleserens title-boks). */}
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 rounded-lg border border-edge bg-bg px-2.5 py-1.5 text-left text-xs group-hover:block">
                    {tooltipForDag(dato)}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      {visSkala && (
        <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-ink-3">
          <span className="mr-1">Mindre</span>
          {nivaaKlasser.map((klasse) => (
            <span
              key={klasse}
              className={`rounded-[3px] ${klasse}`}
              style={{ width: 12, height: 12 }}
            />
          ))}
          <span className="ml-1">Mer</span>
        </div>
      )}
    </div>
  );
}
