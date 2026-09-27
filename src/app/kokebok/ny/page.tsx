import type { Metadata } from "next";
import { SideHeader } from "@/components/SideHeader";
import { TilbakeLenke } from "@/components/TilbakeLenke";
import { OppskriftSkjema } from "@/components/OppskriftSkjema";

export const metadata: Metadata = {
  title: "Ny oppskrift · petter-os",
};

export default function NyOppskrift() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <TilbakeLenke href="/kokebok">Kokebok</TilbakeLenke>
      <OppskriftSkjema />
    </main>
  );
}
