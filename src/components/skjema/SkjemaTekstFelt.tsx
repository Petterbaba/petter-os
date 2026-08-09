// Flerlinje-varianten av SkjemaFelt: etikett over textarea, samme tokens.
export function SkjemaTekstFelt({
  etikett,
  ...textareaProps
}: { etikett: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-3">{etikett}</span>
      <textarea
        {...textareaProps}
        className="w-full resize-y rounded-lg border border-edge bg-bg px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}
