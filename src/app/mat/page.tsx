import type { Metadata } from "next";
import { getMiddager, getUkesplan } from "@/lib/data/mat";
import { dagerIPeriode, iDagOslo, parseIsoDato, tilIsoDato } from "@/lib/dato";
import { erGyldigIsoDato } from "@/lib/validering";
import { isoUkenummer } from "@/lib/format";
import { SideHeader } from "@/components/SideHeader";
import { MatUtforsker } from "@/components/MatUtforsker";
import { UkesplanKort } from "@/components/UkesplanKort";
import { HandlelisteKort } from "@/components/HandlelisteKort";

export const metadata: Metadata = {
  title: "Mat · petter-os",
};

function mandagFor(iso: string): string {
  const dato = parseIsoDato(iso);
  dato.setDate(dato.getDate() - ((dato.getDay() + 6) % 7));
  return tilIsoDato(dato);
}

function skiftDager(iso: string, dager: number): string {
  const dato = parseIsoDato(iso);
  dato.setDate(dato.getDate() + dager);
  return tilIsoDato(dato);
}

// Ukedagsnavnene beregnes her på serveren og sendes som props: Node og
// nettleser kan ha ulike CLDR-versjoner, og et avvik ville gitt
// hydration-feil (jf. landnavn-kommentaren i ReiseUtforsker).
const ukedagFormat = new Intl.DateTimeFormat("nb-NO", {
  weekday: "short",
  timeZone: "UTC",
});

export default async function Mat({
  searchParams,
}: {
  searchParams: Promise<{ uke?: string }>;
}) {
  const { uke } = await searchParams;
  const iDag = iDagOslo();
  const denneUken = mandagFor(iDag);
  // ?uke=<dato> viser uken datoen faller i (snappes til mandag);
  // ugyldig eller manglende verdi faller tilbake til denne uken.
  const mandag =
    uke !== undefined && erGyldigIsoDato(uke) ? mandagFor(uke) : denneUken;
  const sondag = skiftDager(mandag, 6);

  const [middager, planer] = await Promise.all([
    getMiddager(),
    getUkesplan(mandag, sondag),
  ]);

  const dager = dagerIPeriode(mandag, sondag).map((dato) => ({
    dato,
    ukedag: ukedagFormat.format(new Date(dato)).replace(".", ""),
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <div className="space-y-4">
        <UkesplanKort
          dager={dager}
          planer={planer}
          middager={middager}
          iDag={iDag}
          ukeNummer={isoUkenummer(parseIsoDato(mandag))}
          forrigeUke={skiftDager(mandag, -7)}
          nesteUke={skiftDager(mandag, 7)}
          erDenneUken={mandag === denneUken}
        />
        <MatUtforsker middager={middager} />
        <HandlelisteKort planer={planer} middager={middager} />
      </div>
      {/* Kildekrav fra Matvaretabellen: næringsdataene skal krediteres. */}
      <p className="mt-6 text-xs text-ink-3">
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
