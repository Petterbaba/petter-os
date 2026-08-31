import type { Metadata } from "next";
import { getMaalData, getMetrikkTyper } from "@/lib/data/goals";
import { iDagOslo } from "@/lib/dato";
import { SideHeader } from "@/components/SideHeader";
import { MaalUtforsker } from "@/components/MaalUtforsker";

export const metadata: Metadata = {
  title: "Mål · petter-os",
};

export default async function Maal() {
  const [maalData, metrikkTyper] = await Promise.all([
    getMaalData(),
    getMetrikkTyper(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <MaalUtforsker
        maal={maalData.maal}
        logg={maalData.logg}
        metrikkTyper={metrikkTyper}
        iDag={iDagOslo()}
      />
    </main>
  );
}
