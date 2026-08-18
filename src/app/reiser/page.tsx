import type { Metadata } from "next";
import { getReiser } from "@/lib/data/trips";
import { lesVerdenskart, prosesserKart } from "@/lib/kart";
import { landNavn } from "@/lib/format";
import { iDagOslo } from "@/lib/dato";
import { SideHeader } from "@/components/SideHeader";
import { ReiseUtforsker } from "@/components/ReiseUtforsker";

export const metadata: Metadata = {
  title: "Reiser · petter-os",
};

export default async function Reiser() {
  const reiser = await getReiser();
  const { svg, landkoder } = lesVerdenskart();
  const besokte = new Set(reiser.map((reise) => reise.countryCode));
  const kartHtml = prosesserKart(svg, besokte);
  const land = landkoder
    .map((kode) => ({ kode, navn: landNavn(kode) }))
    .sort((a, b) => a.navn.localeCompare(b.navn, "nb"));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <ReiseUtforsker
        kartHtml={kartHtml}
        land={land}
        reiser={reiser}
        standardDato={iDagOslo()}
      />
    </main>
  );
}
