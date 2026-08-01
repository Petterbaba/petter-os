import type { Metadata } from "next";
import { getDashboardData } from "@/lib/mockdata";
import { SideHeader } from "@/components/SideHeader";
import { MetrikkModul } from "@/components/MetrikkModul";

export const metadata: Metadata = {
  title: "Metrikker · petter-os",
};

export default async function Metrikker() {
  const data = await getDashboardData();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <MetrikkModul vekt={data.vekt} />
    </main>
  );
}
