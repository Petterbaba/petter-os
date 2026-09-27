import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMatlaging, getMiddag } from "@/lib/data/mat";
import { erUuid } from "@/lib/validering";
import { SideHeader } from "@/components/SideHeader";
import { TilbakeLenke } from "@/components/TilbakeLenke";
import { OppskriftSkjema } from "@/components/OppskriftSkjema";
import { ArkiverOppskriftKnapp } from "@/components/ArkiverOppskriftKnapp";

export const metadata: Metadata = {
  title: "Rediger oppskrift · petter-os",
};

// Next 16: params er en Promise og må awaites. Ugyldig eller ukjent id
// (også en annen brukers – RLS skjuler den) gir 404.
export default async function RedigerOppskrift({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!erUuid(id)) {
    notFound();
  }
  const [middag, matlaging] = await Promise.all([
    getMiddag(id),
    getMatlaging(id),
  ]);
  if (middag === null) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <TilbakeLenke href={`/kokebok/${middag.id}`}>{middag.title}</TilbakeLenke>
      {matlaging.aktivOkt !== null && (
        <p className="mb-4 rounded-lg border border-dashed border-edge px-3 py-2 text-xs text-ink-3">
          Du holder på å lage denne retten. Lagring nullstiller stegene du
          har huket av.
        </p>
      )}
      <OppskriftSkjema key={middag.id} rediger={middag} />
      <div className="mt-6">
        <ArkiverOppskriftKnapp id={middag.id} />
      </div>
    </main>
  );
}
