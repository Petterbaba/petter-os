import type { JournalEntry } from "@/lib/types";
import { formatDato } from "@/lib/format";
import { DashboardCard } from "./DashboardCard";

// Kompakt samlevisning for dashbordet – journal-siden bruker JournalListe
// (én boks per innførsel med redigering).
type JournalModulProps = {
  innforsler: JournalEntry[];
};

export function JournalModul({ innforsler }: JournalModulProps) {
  if (innforsler.length === 0) {
    return (
      <DashboardCard tittel="Journal">
        <p className="text-sm text-ink-3">Ingen innførsler ennå.</p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard tittel="Journal">
      <ul className="space-y-4">
        {innforsler.map((innforsel) => (
          <li key={innforsel.id}>
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
            <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">
              {innforsel.body}
            </p>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
