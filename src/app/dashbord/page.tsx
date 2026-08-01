import type { Metadata } from "next";
import { getDashboardData } from "@/lib/mockdata";
import { SideHeader } from "@/components/SideHeader";
import { StyrkeModul } from "@/components/StyrkeModul";
import { InvesteringModul } from "@/components/InvesteringModul";
import { MetrikkModul } from "@/components/MetrikkModul";
import { NotatModul } from "@/components/NotatModul";
import { VaneModul } from "@/components/VaneModul";

export const metadata: Metadata = {
  title: "Dashbord · petter-os",
};

export default async function Dashbord() {
  const data = await getDashboardData();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <VaneModul
            vaner={data.vaner}
            oppforinger={data.vaneOppforinger}
            periode={data.vanePeriode}
          />
        </div>
        <StyrkeModul sisteOkt={data.sisteOkt} volumtrend={data.volumtrend} />
        <InvesteringModul kontoer={data.kontoer} portefolje={data.portefolje} />
        <MetrikkModul vekt={data.vekt} />
        <NotatModul notater={data.notater} />
      </div>
    </main>
  );
}
