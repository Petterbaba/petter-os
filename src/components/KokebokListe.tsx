import Link from "next/link";

// Én rad i kokeboken, ferdig formatert på serveren (datoformatering i
// klienten kunne gitt hydration-avvik – jf. landnavn i ReiseUtforsker).
export type KokebokRad = {
  id: string;
  tittel: string;
  meta: string; // «25 min · Lett · 4 porsjoner»
  sistLaget: string | null; // «Sist laget 12. sep · 32 min»
};

// Kokebokens forside: oppskriftene som kort (samme uttrykk som
// middagskortene på /mat), hvert kort en lenke til oppskriften der
// matlagingen startes. «Ny oppskrift» bor i seksjonshodet.
export function KokebokListe({ rader }: { rader: KokebokRad[] }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Kokebok
        </h1>
        <div className="flex items-baseline gap-4">
          <p className="text-xs tabular-nums text-ink-3">
            {rader.length} {rader.length === 1 ? "oppskrift" : "oppskrifter"}
          </p>
          <Link
            href="/kokebok/ny"
            className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
          >
            Ny oppskrift
          </Link>
        </div>
      </div>

      {rader.length === 0 && (
        <p className="rounded-xl border border-dashed border-edge px-4 py-4 text-sm text-ink-3 sm:px-5">
          Ingen oppskrifter ennå – skriv den første med «Ny oppskrift». Alt
          du lager her kan også planlegges i ukesplanen på /mat.
        </p>
      )}

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rader.map((rad) => (
          <li key={rad.id} className="min-w-0">
            <Link
              href={`/kokebok/${rad.id}`}
              className="flex h-full min-w-0 flex-col gap-2 rounded-xl border border-edge bg-card p-4 transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="min-w-0 break-words text-sm font-medium leading-snug text-ink">
                {rad.tittel}
              </span>
              <span className="text-xs tabular-nums text-ink-2">{rad.meta}</span>
              <span className="mt-auto text-xs tabular-nums text-ink-3">
                {rad.sistLaget ?? "Aldri laget"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
