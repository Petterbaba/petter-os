"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Metric } from "@/lib/mockdata";
import { formatDato, formatKg } from "@/lib/format";
import { DashboardCard } from "./DashboardCard";
import { ChartTooltip } from "./ChartTooltip";

type MetrikkModulProps = {
  vekt: Metric[];
};

export function MetrikkModul({ vekt }: MetrikkModulProps) {
  const siste = vekt[vekt.length - 1].weightKg;
  const forste = vekt[0].weightKg;
  const endring = siste - forste;
  const fortegn = endring >= 0 ? "+" : "−";
  const endringTekst = Math.abs(endring).toFixed(1).replace(".", ",");

  // Hele kilo som ticks, så aksen aldri viser samme tall to ganger.
  const verdier = vekt.map((m) => m.weightKg);
  const yMin = Math.floor(Math.min(...verdier) - 0.3);
  const yMax = Math.ceil(Math.max(...verdier) + 0.3);
  const yTicks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);

  return (
    <DashboardCard
      tittel="Metrikker"
      hovedtall={formatKg(siste)}
      undertekst={`${fortegn}${endringTekst} kg siste 12 uker`}
    >
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={vekt} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-grid)" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: "var(--color-axis)" }}
            tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
            ticks={[vekt[0].date, vekt[4].date, vekt[8].date, vekt[vekt.length - 1].date]}
            tickFormatter={formatDato}
          />
          <YAxis
            width={30}
            domain={[yMin, yMax]}
            ticks={yTicks}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
            tickFormatter={(v: number) => `${Math.round(v)}`}
          />
          <Tooltip
            content={
              <ChartTooltip formatLabel={formatDato} formatValue={formatKg} />
            }
          />
          <Line
            type="monotone"
            dataKey="weightKg"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </DashboardCard>
  );
}
