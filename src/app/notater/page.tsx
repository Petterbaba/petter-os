import type { Metadata } from "next";
import { getNotater } from "@/lib/data/notes";
import { SideHeader } from "@/components/SideHeader";
import { NotatModul } from "@/components/NotatModul";

export const metadata: Metadata = {
  title: "Notater · petter-os",
};

export default async function Notater() {
  const notater = await getNotater();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <NotatModul notater={notater} />
    </main>
  );
}
