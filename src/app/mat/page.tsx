import type { Metadata } from "next";
import {
  getMiddager,
  getOdaKatalogStatus,
  getUkesplan,
} from "@/lib/data/mat";
import {
  dagerIPeriode,
  iDagOslo,
  mandagFor,
  parseIsoDato,
  skiftDager,
} from "@/lib/dato";
import { erGyldigIsoDato } from "@/lib/validering";
import { isoUkenummer } from "@/lib/format";
import { SideHeader } from "@/components/SideHeader";
import { MatUtforsker } from "@/components/MatUtforsker";
import { HandlelisteKort } from "@/components/HandlelisteKort";
import { OdaKort } from "@/components/OdaKort";
import { lesOdaTilkobling } from "@/lib/oda/tilkobling";

export const metadata: Metadata = {
  title: "Mat · petter-os",
};

// «Legg i Oda-kurven» gjør opptil 1 + 7 MCP-kall i sekvens (get_cart +
// én rett per kall) og kan bruke 10–20 s – over Vercels standardgrense
// for serverless-funksjoner. Gjelder hele ruten, inkl. actions den
// rendrer (hosting-beslutningen 6. sep 2026).
export const maxDuration = 60;

// Ukedagsnavnene beregnes her på serveren og sendes som props: Node og
// nettleser kan ha ulike CLDR-versjoner, og et avvik ville gitt
// hydration-feil (jf. landnavn-kommentaren i ReiseUtforsker).
const ukedagKort = new Intl.DateTimeFormat("nb-NO", {
  weekday: "short",
  timeZone: "UTC",
});
const ukedagLang = new Intl.DateTimeFormat("nb-NO", {
  weekday: "long",
  timeZone: "UTC",
});
// Synk-tidspunktet er et timestamptz og vises i norsk tid.
const synkFormat = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Oslo",
});

export default async function Mat({
  searchParams,
}: {
  searchParams: Promise<{ uke?: string; oda?: string }>;
}) {
  const { uke, oda } = await searchParams;
  const iDag = iDagOslo();
  const denneUken = mandagFor(iDag);
  // ?uke=<dato> viser uken datoen faller i (snappes til mandag);
  // ugyldig eller manglende verdi faller tilbake til denne uken.
  const mandag =
    uke !== undefined && erGyldigIsoDato(uke) ? mandagFor(uke) : denneUken;
  const sondag = skiftDager(mandag, 6);

  const [middager, planer, odaTilkobling, katalog] = await Promise.all([
    getMiddager(),
    getUkesplan(mandag, sondag),
    lesOdaTilkobling(),
    getOdaKatalogStatus(),
  ]);

  // Oda-kortet: hvilke av ukens retter som kan gå rett i kurven, og
  // status fra OAuth-callbacken (?oda=koblet|feil|konfig).
  const middagPerId = new Map(middager.map((middag) => [middag.id, middag]));
  const ukensMiddager = planer
    .map((plan) => middagPerId.get(plan.dinnerId))
    .filter((middag) => middag !== undefined);
  const odaStatus: Record<string, string> = {
    koblet: "Koblet til Oda.",
    feil: "Kunne ikke koble til Oda. Prøv igjen.",
    konfig: "ODA_COOKIE_SECRET mangler i .env.local (se .env.example).",
  };

  const dager = dagerIPeriode(mandag, sondag).map((dato) => ({
    dato,
    ukedag: ukedagKort.format(new Date(dato)).replace(".", ""),
    ukedagLang: ukedagLang.format(new Date(dato)),
  }));

  // HelloFresh-modellen: dagsruter og middagskort er klikkflater som åpner
  // dialogen (oppskrift med dagsvalg, eller dagens middagsvalg). Siden er
  // bredere enn de andre undersidene (reise-presedensen).
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <MatUtforsker
        middager={middager}
        dager={dager}
        planer={planer}
        iDag={iDag}
        ukeNummer={isoUkenummer(parseIsoDato(mandag))}
        forrigeUke={skiftDager(mandag, -7)}
        nesteUke={skiftDager(mandag, 7)}
        erDenneUken={mandag === denneUken}
        handleliste={
          <div className="space-y-2">
            <HandlelisteKort planer={planer} middager={middager} />
            <OdaKort
              mandag={mandag}
              koblet={odaTilkobling !== null}
              antallMedOda={
                ukensMiddager.filter((middag) => middag.odaRecipeId !== null).length
              }
              utenOda={ukensMiddager
                .filter((middag) => middag.odaRecipeId === null)
                .map((middag) => middag.title)}
              statusMelding={oda === undefined ? null : (odaStatus[oda] ?? null)}
            />
          </div>
        }
      />
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
      {/* Katalog-ferskheten synlig uten terminal (matflyt-planen). */}
      <p className="mt-1 text-xs tabular-nums text-ink-3">
        {katalog.antall === 0
          ? "Oda-katalogen er tom – kjør npm run synk:oda."
          : `Oda-katalog: ${katalog.antall.toLocaleString("nb-NO")} varer` +
            (katalog.sistSynket === null
              ? ""
              : ` · synket ${synkFormat.format(new Date(katalog.sistSynket))}`) +
            " · priser er øyeblikksbilder fra synken"}
      </p>
    </main>
  );
}
