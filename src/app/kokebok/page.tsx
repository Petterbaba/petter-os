import type { Metadata } from "next";
import { getAvsluttedeOkter, getMiddager } from "@/lib/data/mat";
import { formatTidspunktDato } from "@/lib/format";
import {
  formatVarighet,
  oppskriftMeta,
  sisteOktPerMiddag,
  varighetMinutter,
} from "@/lib/matlaging";
import { SideHeader } from "@/components/SideHeader";
import { KokebokListe, type KokebokRad } from "@/components/KokebokListe";

export const metadata: Metadata = {
  title: "Kokebok · petter-os",
};

// Kokeboken viser de SAMME middagene som /mat (én katalog, to visninger).
// «Sist laget» avledes av nyeste avsluttede matlagingsøkt – lagres aldri.
export default async function Kokebok() {
  const [middager, okter] = await Promise.all([
    getMiddager(),
    getAvsluttedeOkter(),
  ]);
  const sisteOkt = sisteOktPerMiddag(okter);

  // Datoer formateres her på serveren, aldri i klienten.
  const rader: KokebokRad[] = middager.map((middag) => {
    const okt = sisteOkt.get(middag.id);
    return {
      id: middag.id,
      tittel: middag.title,
      meta: oppskriftMeta(middag),
      sistLaget:
        okt === undefined || okt.endedAt === null
          ? null
          : `Sist laget ${formatTidspunktDato(okt.endedAt)} · ${formatVarighet(
              varighetMinutter(okt.startedAt, okt.endedAt, okt.pausedSeconds),
            )}`,
    };
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <KokebokListe rader={rader} />
    </main>
  );
}
