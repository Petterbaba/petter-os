import Link from "next/link";
import type { JournalEntry } from "@/lib/types";
import { formatDato } from "@/lib/format";
import { SlettJournalKnapp } from "./SlettJournalKnapp";

// Journal-sidens visning: én boks per innførsel (dashbordet bruker den
// kompakte samlevisningen i JournalModul). Rediger er en lenke stylet
// som knapp – den navigerer til ?rediger=<id>, så <a> er riktig element.
export function JournalListe({ innforsler }: { innforsler: JournalEntry[] }) {
  if (innforsler.length === 0) {
    return (
      <section className="rounded-xl border border-edge bg-card p-4 sm:p-5">
        <p className="text-sm text-ink-3">Ingen innførsler ennå.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {innforsler.map((innforsel) => (
        <article
          key={innforsel.id}
          className="rounded-xl border border-edge bg-card p-4 sm:p-5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <h3 className="min-w-0 break-words text-sm font-medium text-ink">
                {innforsel.title}
              </h3>
              {innforsel.rating !== undefined && (
                <span className="shrink-0 text-xs text-ink-3">
                  {innforsel.rating}/5
                </span>
              )}
            </div>
            <time
              dateTime={innforsel.date}
              className="shrink-0 text-xs text-ink-3"
            >
              {formatDato(innforsel.date)}
            </time>
          </div>
          {/* pre-line bevarer linjeskiftene fra textarea-en. */}
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">
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
        </article>
      ))}
    </div>
  );
}
