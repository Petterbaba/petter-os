import Link from "next/link";
import { DagensDato } from "./DagensDato";
import { TemaKnapp } from "./TemaKnapp";

// Delt topp for undersidene: ordmerke som lenker hjem + dagens dato og
// temaveksler. Bevisst ingen navbar – all navigasjon skjer fra menyen
// på hjemsiden.
export function SideHeader() {
  return (
    // items-baseline på header + items-center kun i høyregruppen: da
    // linjerer ordmerke og dato på felles baseline (gruppen eksporterer
    // første barns baseline) mens ikonknappen sentreres mot datoen.
    <header className="mb-8 flex items-baseline justify-between gap-4">
      <h1 className="text-lg font-semibold tracking-tight">
        <Link href="/">
          petter<span className="text-accent">-os</span>
        </Link>
      </h1>
      <div className="flex items-center gap-2">
        <DagensDato />
        <TemaKnapp />
      </div>
    </header>
  );
}
