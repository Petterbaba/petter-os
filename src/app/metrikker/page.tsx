import type { Metadata } from "next";
import { getVekt } from "@/lib/data/metrics";
import { iDagOslo } from "@/lib/dato";
import { SideHeader } from "@/components/SideHeader";
import { MetrikkModul } from "@/components/MetrikkModul";
import { VektSkjema } from "@/components/VektSkjema";

export const metadata: Metadata = {
  title: "Metrikker · petter-os",
};

export default async function Metrikker() {
  const vekt = await getVekt();
  // Siden er dynamisk (cookies via Supabase-klienten), så datoen er fersk
  // per request. iDagOslo() gir norsk dato uavhengig av server-tidssone.
  const iDag = iDagOslo();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <VektSkjema standardDato={iDag} />
      <MetrikkModul vekt={vekt} />
    </main>
  );
}
