import type { Metadata } from "next";
import { getDashboardData } from "@/lib/mockdata";
import { SideHeader } from "@/components/SideHeader";
import { InvesteringModul } from "@/components/InvesteringModul";

export const metadata: Metadata = {
  title: "Investeringer · petter-os",
};

export default async function Investeringer() {
  const data = await getDashboardData();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <InvesteringModul kontoer={data.kontoer} portefolje={data.portefolje} />
    </main>
  );
}
