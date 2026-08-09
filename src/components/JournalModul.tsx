import Link from "next/link";
import type { JournalEntry } from "@/lib/types";
import { formatDato } from "@/lib/format";
import { DashboardCard } from "./DashboardCard";

type JournalModulProps = {
  innforsler: JournalEntry[];
  // Rediger-lenker vises kun på /journal; dashbordet er ren lesevisning.
  kanRedigere?: boolean;
};

export function JournalModul({
  innforsler,
  kanRedigere = false,
}: JournalModulProps) {
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
              <h3 className="min-w-0 break-words text-sm font-medium text-ink">
                {innforsel.title}
              </h3>
              <div className="flex shrink-0 items-baseline gap-3">
                {innforsel.rating !== undefined && (
                  <span className="text-xs text-ink-3">
                    {innforsel.rating}/5
                  </span>
                )}
                <time
                  dateTime={innforsel.date}
                  className="text-xs text-ink-3"
                >
                  {formatDato(innforsel.date)}
                </time>
                {kanRedigere && (
                  <Link
                    href={`/journal?rediger=${innforsel.id}`}
                    className="text-xs text-ink-3 transition-colors hover:text-ink"
                  >
                    Rediger
                  </Link>
                )}
              </div>
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
