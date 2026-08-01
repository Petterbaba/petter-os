import type { Metadata } from "next";
import { getDashboardData } from "@/lib/mockdata";
import { SideHeader } from "@/components/SideHeader";
import { VaneModul } from "@/components/VaneModul";
import { VaneRadar } from "@/components/VaneRadar";

export const metadata: Metadata = {
  title: "Vaner · petter-os",
};

export default async function Vaner() {
  const data = await getDashboardData();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <div className="space-y-4">
        <VaneModul
          vaner={data.vaner}
          oppforinger={data.vaneOppforinger}
          periode={data.vanePeriode}
        />
        <VaneRadar
          vaner={data.vaner}
          oppforinger={data.vaneOppforinger}
          periode={data.vanePeriode}
        />
      </div>
    </main>
  );
}
