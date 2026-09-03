// Chevron for utvidbare kort/rader (native <details> med `group`-klasse
// på details-elementet): peker ned lukket, roterer opp når åpen.
export function UtvidPil({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className={`h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform group-open:rotate-180 motion-reduce:transition-none ${className}`}
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
