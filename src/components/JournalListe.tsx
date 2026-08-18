import { Fragment } from "react";
import Link from "next/link";
import type { JournalEntry } from "@/lib/types";
import { formatDatoKort, formatMndAar } from "@/lib/format";
import { SlettJournalKnapp } from "./SlettJournalKnapp";

// Journal-sidens visning: tidsgruppert liste med sticky månedsoverskrifter
// og én kompakt rad per innførsel (dato + tittel); raden utvides nedover
// for å lese hele posten. Native <details>/<summary> gir utvidelsen uten
// klient-JS. Rediger er en lenke stylet som knapp – den navigerer til
// ?rediger=<id>, så <a> er riktig element.
export function JournalListe({ innforsler }: { innforsler: JournalEntry[] }) {
  if (innforsler.length === 0) {
    return (
      <section className="rounded-xl border border-edge bg-card p-4 sm:p-5">
        <p className="text-sm text-ink-3">Ingen innførsler ennå.</p>
      </section>
    );
  }

  // Grupper per måned – listen er allerede sortert nyest først.
  const grupper: { mnd: string; innforsler: JournalEntry[] }[] = [];
  for (const innforsel of innforsler) {
    const mnd = innforsel.date.slice(0, 7);
    const siste = grupper[grupper.length - 1];
    if (siste?.mnd === mnd) {
      siste.innforsler.push(innforsel);
    } else {
      grupper.push({ mnd, innforsler: [innforsel] });
    }
  }

  return (
    // overflow-clip, ikke -hidden: hidden gjør seksjonen til scroll-
    // container og dreper sticky-overskriftene; clip klipper hjørnene
    // uten den bivirkningen.
    <section className="divide-y divide-edge overflow-clip rounded-xl border border-edge bg-card">
      {grupper.map((gruppe) => (
        <Fragment key={gruppe.mnd}>
          <h3 className="sticky top-0 z-10 bg-card px-4 py-2.5 text-sm font-medium text-ink sm:px-5">
            {formatMndAar(`${gruppe.mnd}-01`)}
          </h3>
          {gruppe.innforsler.map((innforsel) => (
            <details key={innforsel.id} className="group">
              <summary className="flex cursor-pointer list-none items-baseline gap-3 px-4 py-3 transition-colors hover:bg-bg/60 sm:px-5 [&::-webkit-details-marker]:hidden">
                <time
                  dateTime={innforsel.date}
                  className="w-14 shrink-0 text-xs tabular-nums text-ink-3"
                >
                  {formatDatoKort(innforsel.date)}
                </time>
                <span className="min-w-0 flex-1 break-words text-sm font-medium text-ink">
                  {innforsel.title}
                </span>
                {innforsel.rating !== undefined && (
                  <span className="shrink-0 text-xs text-ink-3">
                    {innforsel.rating}/5
                  </span>
                )}
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 self-center text-ink-3 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="px-4 pb-4 sm:px-5 sm:pl-[4.75rem]">
                {/* pre-line bevarer linjeskiftene fra textarea-en. */}
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">
                  {innforsel.body}
                </p>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <SlettJournalKnapp id={innforsel.id} />
                  <Link
                    href={`/journal?rediger=${innforsel.id}`}
                    className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
                  >
                    Rediger
                  </Link>
                </div>
              </div>
            </details>
          ))}
        </Fragment>
      ))}
    </section>
  );
}
