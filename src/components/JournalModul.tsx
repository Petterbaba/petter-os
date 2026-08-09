import type { JournalEntry } from "@/lib/types";
import { formatDato } from "@/lib/format";
import { DashboardCard } from "./DashboardCard";

type JournalModulProps = {
  innforsler: JournalEntry[];
};

export function JournalModul({ innforsler }: JournalModulProps) {
  return (
    <DashboardCard tittel="Journal">
      <ul className="space-y-4">
        {innforsler.map((innforsel) => (
          <li key={innforsel.id}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-medium text-ink">{innforsel.title}</h3>
              <time
                dateTime={innforsel.date}
                className="shrink-0 text-xs text-ink-3"
              >
                {formatDato(innforsel.date)}
              </time>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {innforsel.body}
            </p>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
