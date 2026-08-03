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

// Innfasingssekvens: vektlinjen tegnes først, deretter trendlinjen.
const LINJE_MS = 1100;
const TREND_START_MS = LINJE_MS + 150;

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

  // Minste kvadraters trend over måleindeks – annotasjon, ikke egen serie.
  const antall = verdier.length;
  const snittX = (antall - 1) / 2;
  const snittY = verdier.reduce((sum, v) => sum + v, 0) / antall;
  const stigning =
    verdier.reduce((sum, v, i) => sum + (i - snittX) * (v - snittY), 0) /
    verdier.reduce((sum, _, i) => sum + (i - snittX) ** 2, 0);
  const punkter = vekt.map((maling, i) => ({
    ...maling,
    trend: snittY + stigning * (i - snittX),
  }));

  // Recharts-animasjonene må skrus av i JS ved redusert bevegelse
  // (CSS-media-queryen dekker bare punktene). Komponenten er client-only,
  // og grafen rendres først i nettleseren, så sjekken er trygg her.
  const animert =
    typeof window !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <DashboardCard
      tittel="Metrikker"
      hovedtall={formatKg(siste)}
      undertekst={`${fortegn}${endringTekst} kg siste 12 uker`}
    >
      <ResponsiveContainer width="100%" height={150}>
        <LineChart
          data={punkter}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
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
            type="linear"
            dataKey="trend"
            stroke="var(--color-ink-3)"
            strokeWidth={1.5}
            strokeDasharray="4 5"
            strokeLinecap="round"
            dot={false}
            activeDot={false}
            tooltipType="none"
            legendType="none"
            isAnimationActive={animert}
            animationBegin={TREND_START_MS}
            animationDuration={600}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="weightKg"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
            isAnimationActive={animert}
            animationDuration={LINJE_MS}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </DashboardCard>
  );
}
