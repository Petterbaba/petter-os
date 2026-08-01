"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { Habit, HabitEntry } from "@/lib/mockdata";
import { vaneStatusSiste30 } from "@/lib/vaner";
import { DashboardCard } from "./DashboardCard";
import { ChartTooltip } from "./ChartTooltip";

type VaneRadarProps = {
  vaner: Habit[];
  oppforinger: HabitEntry[];
  periode: { fra: string; til: string };
};

export function VaneRadar({ vaner, oppforinger, periode }: VaneRadarProps) {
  const { perVane, antallDager } = vaneStatusSiste30(
    vaner,
    oppforinger,
    periode,
  );
  const data = perVane.map((vane) => ({
    navn: vane.name,
    prosent: Math.round((vane.antall / antallDager) * 100),
  }));

  return (
    <DashboardCard
      tittel="Kategorier"
      undertekst={`Måloppnåelse siste ${antallDager} dager`}
    >
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="var(--color-grid)" />
          <PolarAngleAxis
            dataKey="navn"
            tick={{ fill: "var(--color-ink-2)", fontSize: 11 }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Tooltip
            content={<ChartTooltip formatValue={(v) => `${v} %`} />}
          />
          <Radar
            dataKey="prosent"
            stroke="var(--color-accent)"
            strokeWidth={2}
            fill="var(--color-accent)"
            fillOpacity={0.1}
            dot={{ r: 3, fill: "var(--color-accent)" }}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </DashboardCard>
  );
}
