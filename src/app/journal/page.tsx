import type { Metadata } from "next";
import { getJournal } from "@/lib/data/journal";
import { SideHeader } from "@/components/SideHeader";
import { JournalModul } from "@/components/JournalModul";

export const metadata: Metadata = {
  title: "Journal · petter-os",
};

export default async function Journal() {
  const innforsler = await getJournal();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <JournalModul innforsler={innforsler} />
    </main>
  );
}
