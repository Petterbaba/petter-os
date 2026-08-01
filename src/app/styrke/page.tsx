import type { Metadata } from "next";
import { getDashboardData } from "@/lib/mockdata";
import { SideHeader } from "@/components/SideHeader";
import { StyrkeModul } from "@/components/StyrkeModul";

export const metadata: Metadata = {
  title: "Styrke · petter-os",
};

export default async function Styrke() {
  const data = await getDashboardData();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <StyrkeModul sisteOkt={data.sisteOkt} volumtrend={data.volumtrend} />
    </main>
  );
}
