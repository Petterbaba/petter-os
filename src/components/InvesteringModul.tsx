"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Account, PortfolioPoint } from "@/lib/mockdata";
import { formatDato, formatMndKort, formatNok } from "@/lib/format";
import { DashboardCard } from "./DashboardCard";
import { ChartTooltip } from "./ChartTooltip";

type InvesteringModulProps = {
  kontoer: Account[];
  portefolje: PortfolioPoint[];
};

export function InvesteringModul({ kontoer, portefolje }: InvesteringModulProps) {
  const naa = portefolje[portefolje.length - 1].valueNok;
  const start = portefolje[0].valueNok;
  const endring = naa - start;
  const endringProsent = ((endring / start) * 100).toFixed(1).replace(".", ",");
  const fortegn = endring >= 0 ? "+" : "−";

  // Runde 25k-steg som ticks i stedet for recharts' rå dataMin/dataMax.
  const STEG = 25000;
  const verdier = portefolje.map((p) => p.valueNok);
  const yMin = Math.floor(Math.min(...verdier) / STEG) * STEG;
  const yMax = Math.ceil(Math.max(...verdier) / STEG) * STEG;
  const yTicks = Array.from(
    { length: (yMax - yMin) / STEG + 1 },
    (_, i) => yMin + i * STEG,
  );

  return (
    <DashboardCard
      tittel="Investeringer"
      hovedtall={formatNok(naa)}
      undertekst={`${fortegn}${formatNok(Math.abs(endring))} (${fortegn}${endringProsent} %) siste 6 mnd`}
    >
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={portefolje} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-grid)" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: "var(--color-axis)" }}
            tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
            ticks={portefolje
              .map((p) => p.date)
              .filter((d) => d.endsWith("-01"))}
            tickFormatter={formatMndKort}
          />
          <YAxis
            width={38}
            domain={[yMin, yMax]}
            ticks={yTicks}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-ink-3)", fontSize: 11 }}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            content={
              <ChartTooltip formatLabel={formatDato} formatValue={formatNok} />
            }
          />
          <Area
            type="monotone"
            dataKey="valueNok"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="var(--color-accent)"
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <ul className="mt-4 space-y-1.5">
        {kontoer.map((konto) => (
          <li
            key={konto.id}
            className="flex items-baseline justify-between gap-3 text-sm"
          >
            <span className="text-ink-2">{konto.name}</span>
            <span className="tabular-nums text-ink">{formatNok(konto.valueNok)}</span>
          </li>
        ))}
      </ul>
    </DashboardCard>
  );
}
