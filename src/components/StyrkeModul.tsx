"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyVolume, Workout, WorkoutSet } from "@/lib/types";
import { formatDato } from "@/lib/format";
import { DashboardCard } from "./DashboardCard";
import { ChartTooltip } from "./ChartTooltip";

type StyrkeModulProps = {
  sisteOkt: Workout;
  volumtrend: WeeklyVolume[];
};

// Tyngste sett per øvelse, i rekkefølgen øvelsene ble gjort.
function toppsett(sets: WorkoutSet[]): WorkoutSet[] {
  const beste = new Map<string, WorkoutSet>();
  for (const sett of sets) {
    const eksisterende = beste.get(sett.exercise);
    if (!eksisterende || sett.weightKg > eksisterende.weightKg) {
      beste.set(sett.exercise, sett);
    }
  }
  return [...beste.values()];
}

const vektFormat = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 });

export function StyrkeModul({ sisteOkt, volumtrend }: StyrkeModulProps) {
  return (
    <DashboardCard
      tittel="Styrke"
      hovedtall={sisteOkt.name}
      undertekst={`Siste økt · ${formatDato(sisteOkt.date)} · ${sisteOkt.durationMin} min`}
    >
      <ul className="mb-5 space-y-1.5">
        {toppsett(sisteOkt.sets).map((sett) => (
          <li
            key={sett.exercise}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="text-ink-2">{sett.exercise}</span>
            <span className="tabular-nums text-ink">
              {vektFormat.format(sett.weightKg)} kg × {sett.reps}
            </span>
          </li>
        ))}
      </ul>
      <p className="mb-2 text-xs text-ink-3">Volum per uke, siste 8 uker</p>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={volumtrend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-grid)" />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={{ stroke: "var(--color-axis)" }}
            tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
            tickFormatter={(uke: string) => uke.replace("Uke ", "")}
          />
          <YAxis
            width={30}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
            tickFormatter={(v: number) => (v === 0 ? "0" : `${v / 1000}k`)}
          />
          <Tooltip
            cursor={{ fill: "rgba(255, 255, 255, 0.04)" }}
            content={
              <ChartTooltip
                formatValue={(v) => `${v.toLocaleString("nb-NO")} kg`}
              />
            }
          />
          <Bar
            dataKey="volumeKg"
            fill="var(--color-accent)"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </DashboardCard>
  );
}
