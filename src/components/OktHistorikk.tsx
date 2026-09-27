import { SlettOktKnapp } from "./SlettOktKnapp";

// Én avsluttet matlagingsøkt, ferdig formatert på serveren.
export type OktHistorikkRad = {
  id: string;
  dato: string; // «12. sep»
  varighet: string; // «32 min» (pausetid trukket fra)
};

// Historikken nederst på oppskriftssiden: hvor mange ganger retten er
// laget (eksakt telling) og de siste øktene, sammenlignet med
// oppskriftens egen tid. Hver rad kan slettes (feilregistreringer).
// Alt er avledet av cooking_sessions – lagres aldri.
export function OktHistorikk({
  middagId,
  antall,
  rader,
  oppskriftTid,
}: {
  middagId: string;
  antall: number;
  rader: OktHistorikkRad[];
  oppskriftTid: string | null; // «25 min», eller null når oppskriften mangler tid
}) {
  return (
    <section>
      <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
        Historikk
      </h2>
      {antall === 0 ? (
        <p className="mt-2 text-sm text-ink-3">Ingen fullførte økter ennå.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-2">
            Laget {antall} {antall === 1 ? "gang" : "ganger"}
            {rader.length > 0 && ` · sist ${rader[0].dato}`}
          </p>
          <ul className="mt-2 divide-y divide-edge text-sm">
            {rader.map((rad) => (
              <li
                key={rad.id}
                className="flex items-baseline justify-between gap-3 py-2"
              >
                <span className="text-ink-2">{rad.dato}</span>
                <span className="flex items-baseline gap-4">
                  <span className="tabular-nums text-ink">
                    {rad.varighet}
                    {oppskriftTid !== null && (
                      <span className="text-ink-3"> (oppskriften: {oppskriftTid})</span>
                    )}
                  </span>
                  <SlettOktKnapp
                    oktId={rad.id}
                    middagId={middagId}
                    beskrivelse={`${rad.dato} · ${rad.varighet}`}
                  />
                </span>
              </li>
            ))}
          </ul>
          {antall > rader.length && (
            <p className="mt-1 text-xs text-ink-3">
              Viser de {rader.length} siste.
            </p>
          )}
        </>
      )}
    </section>
  );
}
