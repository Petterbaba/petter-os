import Link from "next/link";
import { DagensDato } from "@/components/DagensDato";
import { Klokke } from "@/components/Klokke";
import { SkriveLogo } from "@/components/SkriveLogo";

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
    <main className="flex flex-1 flex-col items-center justify-center gap-12 px-4 py-16 md:flex-row md:items-stretch md:gap-8 md:p-0">
      <nav
        aria-label="Hovedmeny"
        className="order-2 w-full max-w-sm md:order-none md:w-72 md:shrink-0 md:border-r md:border-edge md:pt-24 md:pr-6 md:pl-8"
      >
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
      <div className="order-1 flex flex-col items-center gap-3 text-center md:order-none md:flex-1 md:self-center">
        <h1 className="font-mono text-4xl font-normal tracking-[0.08em] sm:text-5xl">
          <SkriveLogo />
        </h1>
        <p className="min-h-[1em] text-2xl leading-none text-ink-2 sm:text-3xl">
          <Klokke />
        </p>
        <DagensDato className="text-sm text-ink-3" medUke />
      </div>
    </main>
  );
}
