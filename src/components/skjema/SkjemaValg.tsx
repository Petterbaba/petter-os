// Delt presentasjon for nedtrekksvalg – samme uttrykk som SkjemaFelt.
export function SkjemaValg({
  etikett,
  children,
  ...selectProps
}: { etikett: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-3">{etikett}</span>
      <select
        {...selectProps}
        className="w-full rounded-lg border border-edge bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
      >
        {children}
      </select>
    </label>
  );
}
