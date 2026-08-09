import { dagerIPeriode, parseIsoDato } from "@/lib/dato";

// Delt presentasjon for kalender-heatmap (vaner, journal): uker som
// kolonner fra mandag, månedsetiketter der ny måned begynner, valgfri
// «Mindre … Mer»-skala. Domenene leverer nivå (0–4 → heat-trappen) og
// tooltip-tekst per dag; `fra` bør være en mandag for at radene skal
// treffe man–søn.
type HeatmapRutenettProps = {
  fra: string;
  til: string;
  nivaaForDag: (dato: string) => number;
  tittelForDag: (dato: string) => string;
  visSkala?: boolean;
};

const CELLE_PX = 12;
const GAP_PX = 3;

// Tailwind trenger klassenavnene fullt utskrevet for å generere dem.
const nivaaKlasser = [
  "bg-heat-0",
  "bg-heat-1",
  "bg-heat-2",
  "bg-heat-3",
  "bg-heat-4",
];

const mndFormat = new Intl.DateTimeFormat("nb-NO", { month: "short" });

export function HeatmapRutenett({
  fra,
  til,
  nivaaForDag,
  tittelForDag,
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
      ? mndFormat.format(mandag).replace(".", "")
      : null;
  });

  return (
    // dir-trikset forankrer startposisjonen til HØYRE kant: på smale
    // skjermer vises de ferskeste ukene (som header-tallene beskriver),
    // ikke de eldste. Innholdet renderes normalt via dir="ltr".
    // aria-hidden: cellene er tomme spans med kun title-tooltip (ikke
    // nåbare med tastatur/skjermleser) – tallene finnes i kort-headeren
    // og listene, så rutenettet er ren pynt for hjelpemidler.
    <div className="overflow-x-auto pb-1" dir="rtl" aria-hidden="true">
      <div className="w-max" dir="ltr">
        <div
          className="relative mb-1 h-4 text-[10px] text-ink-3"
          style={{ marginLeft: 26 }}
        >
          {mndEtiketter.map(
            (etikett, i) =>
              etikett && (
                <span
                  key={i}
                  className="absolute"
                  style={{ left: i * (CELLE_PX + GAP_PX) }}
                >
                  {etikett}
                </span>
              ),
          )}
        </div>
        <div className="flex" style={{ gap: GAP_PX }}>
          <div
            className="grid w-[23px] pr-1 text-right text-[10px] text-ink-3"
            style={{ gridTemplateRows: `repeat(7, ${CELLE_PX}px)`, gap: GAP_PX }}
          >
            <span className="leading-[12px]">man</span>
            <span />
            <span className="leading-[12px]">ons</span>
            <span />
            <span className="leading-[12px]">fre</span>
          </div>
          {uker.map((uke, ukeIndeks) => (
            <div
              key={ukeIndeks}
              className="grid"
              style={{ gridTemplateRows: `repeat(7, ${CELLE_PX}px)`, gap: GAP_PX }}
            >
              {uke.map((dato) => (
                <span
                  key={dato}
                  title={tittelForDag(dato)}
                  className={`rounded-[3px] ${nivaaKlasser[nivaaForDag(dato)]}`}
                  style={{ width: CELLE_PX, height: CELLE_PX }}
                />
              ))}
            </div>
          ))}
        </div>
        {visSkala && (
          <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-ink-3">
            <span className="mr-1">Mindre</span>
            {nivaaKlasser.map((klasse) => (
              <span
                key={klasse}
                className={`rounded-[3px] ${klasse}`}
                style={{ width: CELLE_PX, height: CELLE_PX }}
              />
            ))}
            <span className="ml-1">Mer</span>
          </div>
        )}
      </div>
    </div>
  );
}
