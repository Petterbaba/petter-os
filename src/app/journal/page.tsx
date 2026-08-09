import type { Metadata } from "next";
import { getDagsvurdering, getJournal } from "@/lib/data/journal";
import { iDagOslo } from "@/lib/dato";
import { SideHeader } from "@/components/SideHeader";
import { JournalHeatmap } from "@/components/JournalHeatmap";
import { JournalModul } from "@/components/JournalModul";
import { JournalSkjema } from "@/components/JournalSkjema";

export const metadata: Metadata = {
  title: "Journal · petter-os",
};

export default async function Journal({
  searchParams,
}: {
  searchParams: Promise<{ rediger?: string | string[] }>;
}) {
  const { rediger } = await searchParams;
  const innforsler = await getJournal();
  // Siden er dynamisk (cookies via Supabase-klienten), så datoen er fersk
  // per request. iDagOslo() gir norsk dato uavhengig av server-tidssone.
  const iDag = iDagOslo();

  // Redigeringsmodus: ?rediger=<id> plukker innførselen fra listen som
  // allerede er hentet – ukjent id faller stille tilbake til «ny»-modus.
  const redigerInnforsel =
    typeof rediger === "string"
      ? innforsler.find((innforsel) => innforsel.id === rediger)
      : undefined;

  // Vurderingen gjelder dagen i fokus: den redigerte dagen, ellers i dag.
  const vurderingsDato = redigerInnforsel?.date ?? iDag;
  const gjeldendeVurdering = await getDagsvurdering(vurderingsDato);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <div className="mb-4">
        <JournalHeatmap innforsler={innforsler} til={iDag} />
      </div>
      <JournalSkjema
        key={redigerInnforsel?.id ?? "ny"}
        standardDato={iDag}
        standardVurdering={gjeldendeVurdering}
        rediger={
          redigerInnforsel && {
            id: redigerInnforsel.id,
            dato: redigerInnforsel.date,
            tittel: redigerInnforsel.title,
            tekst: redigerInnforsel.body,
          }
        }
      />
      <JournalModul innforsler={innforsler} kanRedigere />
    </main>
  );
}
