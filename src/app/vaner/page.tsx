import type { Metadata } from "next";
import { getVaneData } from "@/lib/data/habits";
import { SideHeader } from "@/components/SideHeader";
import { VaneModul } from "@/components/VaneModul";
import { VaneRadar } from "@/components/VaneRadar";

export const metadata: Metadata = {
  title: "Vaner · petter-os",
};

export default async function Vaner() {
  const { vaner, oppforinger, periode } = await getVaneData();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <div className="space-y-4">
        <VaneModul vaner={vaner} oppforinger={oppforinger} periode={periode} />
        <VaneRadar vaner={vaner} oppforinger={oppforinger} periode={periode} />
      </div>
    </main>
  );
}
