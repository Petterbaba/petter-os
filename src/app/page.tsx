import { getDashboardData } from "@/lib/mockdata";
import { DagensDato } from "@/components/DagensDato";
import { StyrkeModul } from "@/components/StyrkeModul";
import { InvesteringModul } from "@/components/InvesteringModul";
import { MetrikkModul } from "@/components/MetrikkModul";
import { NotatModul } from "@/components/NotatModul";

export default async function Dashbord() {
  const data = await getDashboardData();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <h1 className="text-lg font-semibold tracking-tight">
          petter<span className="text-accent">-os</span>
        </h1>
        <DagensDato />
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StyrkeModul sisteOkt={data.sisteOkt} volumtrend={data.volumtrend} />
        <InvesteringModul kontoer={data.kontoer} portefolje={data.portefolje} />
        <MetrikkModul vekt={data.vekt} />
        <NotatModul notater={data.notater} />
      </div>
    </main>
  );
}
