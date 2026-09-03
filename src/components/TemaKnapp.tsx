import { cookies } from "next/headers";
import { settTema } from "@/app/actions";
import { lesTema, TEMA_COOKIE } from "@/lib/tema";

// Toggle mellom mørkt og lyst tema. Ren server-komponent: skjema-POST
// setter cookien og hele treet re-rendres med nytt tema – null
// klient-JS, så knappen virker også før hydrering. Målverdien ligger i
// et skjult felt (ikke toggle i actionen) så re-POST er idempotent.
// Ikonet viser temaet du bytter TIL (sol i mørk modus, måne i lys).
export async function TemaKnapp({ className }: { className?: string }) {
  const tema = lesTema((await cookies()).get(TEMA_COOKIE)?.value);
  const tilLys = tema === "mork";
  const knappTekst = tilLys ? "Bytt til lyst tema" : "Bytt til mørkt tema";

  return (
    <form action={settTema} className={className}>
      <input type="hidden" name="tema" value={tilLys ? "lys" : "mork"} />
      <button
        type="submit"
        aria-label={knappTekst}
        title={knappTekst}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:text-ink"
      >
        {tilLys ? <SolIkon /> : <MaaneIkon />}
      </button>
    </form>
  );
}

function SolIkon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MaaneIkon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
