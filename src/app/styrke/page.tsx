import type { Metadata } from "next";
import { getSisteOkt, getVolumtrend } from "@/lib/data/workouts";
import { SideHeader } from "@/components/SideHeader";
import { StyrkeModul } from "@/components/StyrkeModul";

export const metadata: Metadata = {
  title: "Styrke · petter-os",
};

export default async function Styrke() {
  const [sisteOkt, volumtrend] = await Promise.all([
    getSisteOkt(),
    getVolumtrend(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <StyrkeModul sisteOkt={sisteOkt} volumtrend={volumtrend} />
    </main>
  );
}
