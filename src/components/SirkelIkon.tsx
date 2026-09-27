// Pluss/minus i sirkel – ukesplanens legg-til- og fjern-ikon (valgt
// sep. 2026): pluss velger en rett i dagsvalget, minus fjerner den – på
// dagskortet og på den valgte raden i dagsvalget. Samme
// strekstil som TemaKnapp (Lucide-geometri, 24-rutenett, strek 2).
// className styrer størrelsen (standard 16 px).
export function SirkelIkon({
  tegn,
  className = "h-4 w-4",
}: {
  tegn: "pluss" | "minus";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      {tegn === "pluss" && <path d="M12 8v8" />}
    </svg>
  );
}
