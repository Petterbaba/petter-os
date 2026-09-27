import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatlaging, getMiddag } from "@/lib/data/mat";
import { erUuid } from "@/lib/validering";
import { formatTidspunktDato } from "@/lib/format";
import {
  formatVarighet,
  oppskriftMeta,
  varighetMinutter,
} from "@/lib/matlaging";
import type { CookingSession } from "@/lib/types";
import { SideHeader } from "@/components/SideHeader";
import { TilbakeLenke } from "@/components/TilbakeLenke";
import { Matlaging } from "@/components/Matlaging";
import { MiddagOversikt } from "@/components/MiddagOversikt";
import { OktHistorikk } from "@/components/OktHistorikk";

export const metadata: Metadata = {
  title: "Kokebok · petter-os",
};

// Varigheten til en AVSLUTTET økt («32 min», pausetid trukket fra) –
// avledet, aldri lagret.
function varighet(okt: CookingSession): string {
  return okt.endedAt === null
    ? ""
    : formatVarighet(
        varighetMinutter(okt.startedAt, okt.endedAt, okt.pausedSeconds),
      );
}

// Oppskriften og matlagingen på samme side (brukerens valg sep. 2026).
// Next 16: params er en Promise og må awaites. Ugyldig eller ukjent id
// (også en annen brukers – RLS skjuler den) gir 404. Alle datoer og
// varigheter formateres her på serveren; klienten får ISO-tidspunkter
// kun der timeren trenger dem.
export default async function Oppskrift({
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

  const oppskriftTid =
    middag.cookMinutes === null ? null : formatVarighet(middag.cookMinutes);
  const sisteOkt = matlaging.historikk[0];
  const sisteOktTekst =
    sisteOkt === undefined || sisteOkt.endedAt === null
      ? null
      : `Sist laget ${formatTidspunktDato(sisteOkt.endedAt)} – ferdig på ${varighet(sisteOkt)}` +
        (oppskriftTid === null ? "." : ` (oppskriften: ${oppskriftTid}).`);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <TilbakeLenke href="/kokebok">Kokebok</TilbakeLenke>

      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-semibold leading-snug text-ink">
            {middag.title}
          </h1>
          <p className="mt-1 text-xs tabular-nums text-ink-3">
            {oppskriftMeta(middag)}
          </p>
        </div>
        <Link
          href={`/kokebok/${middag.id}/rediger`}
          className="shrink-0 rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
        >
          Rediger
        </Link>
      </header>

      <Matlaging
        middag={middag}
        aktivOkt={matlaging.aktivOkt}
        gjorteStegIder={matlaging.gjorteStegIder}
        sisteOktTekst={sisteOktTekst}
      >
        <MiddagOversikt middag={middag} />
      </Matlaging>

      {(middag.notes || middag.sourceUrl) && (
        <section className="mt-6">
          {middag.notes && (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-ink-3">
              {middag.notes}
            </p>
          )}
          {middag.sourceUrl && (
            <p className="mt-2 truncate text-xs text-ink-3">
              Kilde:{" "}
              <a
                href={middag.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
              >
                {middag.sourceUrl.replace(/^https?:\/\//, "")}
              </a>
            </p>
          )}
        </section>
      )}

      <div className="mt-8">
        <OktHistorikk
          middagId={middag.id}
          antall={matlaging.antallOkter}
          oppskriftTid={oppskriftTid}
          rader={matlaging.historikk.map((okt) => ({
            id: okt.id,
            dato: okt.endedAt === null ? "" : formatTidspunktDato(okt.endedAt),
            varighet: varighet(okt),
          }))}
        />
      </div>

      {/* Kildekrav fra Matvaretabellen: næringsdataene skal krediteres. */}
      <p className="mt-8 text-xs text-ink-3">
        Næringsdata:{" "}
        <a
          href="https://www.matvaretabellen.no/"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
        >
          Matvaretabellen
        </a>
        , Mattilsynet.
      </p>
    </main>
  );
}
