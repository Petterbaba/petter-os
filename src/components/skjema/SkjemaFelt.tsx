// Delt presentasjon for skjemafelt: etikett over input, i appens tokens.
export function SkjemaFelt({
  etikett,
  ...inputProps
}: { etikett: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-3">{etikett}</span>
      <input
        {...inputProps}
        className="w-full rounded-lg border border-edge bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}
