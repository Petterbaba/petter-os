import Link from "next/link";
import { DagensDato } from "./DagensDato";

// Delt topp for undersidene: ordmerke som lenker hjem + dagens dato.
// Bevisst ingen navbar – all navigasjon skjer fra menyen på hjemsiden.
export function SideHeader() {
  return (
    <header className="mb-8 flex items-baseline justify-between gap-4">
      <h1 className="text-lg font-semibold tracking-tight">
        <Link href="/">
          petter<span className="text-accent">-os</span>
        </Link>
      </h1>
      <DagensDato />
    </header>
  );
}
