// Delt mini-fremdriftsbar (samme uttrykk som vane-listen på dashbordet):
// hårfin track i heat-0 med accent-fyll. null = ukjent fremdrift (f.eks.
// metrikk-mål uten målinger) og vises som tom track.
export function FremdriftsBar({ andel }: { andel: number | null }) {
  const prosent = andel === null ? 0 : Math.min(100, Math.max(0, andel * 100));

  return (
    <span className="h-1 w-20 shrink-0 overflow-hidden rounded-full bg-heat-0">
      <span
        className="block h-full rounded-full bg-accent"
        style={{ width: `${prosent}%` }}
      />
    </span>
  );
}
