import Link from "next/link";
import { DagensDato } from "@/components/DagensDato";
import { Klokke } from "@/components/Klokke";

const meny = [
  { href: "/dashbord", navn: "Dashbord", beskrivelse: "alt på ett brett" },
  { href: "/vaner", navn: "Vaner", beskrivelse: "måloppnåelse per dag" },
  { href: "/styrke", navn: "Styrke", beskrivelse: "siste økt og volum" },
  { href: "/investeringer", navn: "Investeringer", beskrivelse: "portefølje" },
  { href: "/metrikker", navn: "Metrikker", beskrivelse: "vektkurve" },
  { href: "/notater", navn: "Notater", beskrivelse: "refleksjoner" },
];

export default function Hjem() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-12 px-4 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-ink-3">
          petter<span className="text-accent">-os</span>
        </p>
        <p className="min-h-[1em] text-7xl font-semibold leading-none tracking-tight sm:text-8xl">
          <Klokke />
        </p>
        <DagensDato className="text-base text-ink-2" />
      </div>
      <nav aria-label="Hovedmeny" className="w-full max-w-sm">
        <ul>
          {meny.map((punkt) => (
            <li key={punkt.href} className="border-t border-edge last:border-b">
              <Link
                href={punkt.href}
                className="group flex items-baseline justify-between gap-4 px-2 py-3 transition-colors hover:bg-card"
              >
                <span className="text-sm font-medium text-ink group-hover:text-accent">
                  {punkt.navn}
                </span>
                <span className="text-xs text-ink-3">{punkt.beskrivelse}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
