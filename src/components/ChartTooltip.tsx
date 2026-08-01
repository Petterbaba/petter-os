type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ value?: number | string }>;
  formatLabel?: (label: string) => string;
  formatValue: (verdi: number) => string;
};

export function ChartTooltip({
  active,
  label,
  payload,
  formatLabel,
  formatValue,
}: ChartTooltipProps) {
  if (!active || !payload?.length || typeof payload[0].value !== "number") {
    return null;
  }
  const vistLabel =
    formatLabel && label != null ? formatLabel(String(label)) : label;
  return (
    <div className="rounded-lg border border-edge bg-bg px-3 py-2 shadow-lg">
      {vistLabel != null && <p className="text-xs text-ink-3">{vistLabel}</p>}
      <p className="text-sm font-medium text-ink">
        {formatValue(payload[0].value)}
      </p>
    </div>
  );
}
