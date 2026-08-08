import type { Note } from "@/lib/types";
import { formatDato } from "@/lib/format";
import { DashboardCard } from "./DashboardCard";

type NotatModulProps = {
  notater: Note[];
};

export function NotatModul({ notater }: NotatModulProps) {
  return (
    <DashboardCard tittel="Notater">
      <ul className="space-y-4">
        {notater.map((notat) => (
          <li key={notat.id}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-medium text-ink">{notat.title}</h3>
              <time dateTime={notat.date} className="shrink-0 text-xs text-ink-3">
                {formatDato(notat.date)}
              </time>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {notat.body}
            </p>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
