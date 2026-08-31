"use client";

import { Fragment } from "react";
import type { Goal, GoalEntry, MetrikkType } from "@/lib/types";
import { formatDatoKort, formatTall } from "@/lib/format";
import {
  dagerIgjen,
  erFullfort,
  erIRute,
  fremdriftsandel,
} from "@/lib/maal";
import { FremdriftsBar } from "./FremdriftsBar";
import { SlettMaalKnapp } from "./SlettMaalKnapp";
import { SlettFremdriftKnapp } from "./SlettFremdriftKnapp";

type Gruppe = { navn: string; maal: Goal[] };

// Fremdriftsmålene gruppert Aktive/Fullførte/Utløpte, med én kompakt rad
// per mål som utvides nedover med native <details> (reise-mønsteret).
// «Nytt mål»-knappen bor i seksjonshodet; dialogen eies av MaalUtforsker.
export function MaalListe({
  maal,
  logg,
  metrikkTyper,
  iDag,
  onNytt,
  onRediger,
  onLoggFremdrift,
}: {
  maal: Goal[];
  logg: GoalEntry[];
  metrikkTyper: MetrikkType[];
  iDag: string;
  onNytt: () => void;
  onRediger: (maal: Goal) => void;
  onLoggFremdrift: (maal: Goal) => void;
}) {
  const metrikkNavn = new Map(metrikkTyper.map((type) => [type.key, type.label]));

  const grupper: Gruppe[] = [
    { navn: "Aktive", maal: [] },
    { navn: "Fullførte", maal: [] },
    { navn: "Utløpte", maal: [] },
  ];
  for (const punkt of maal) {
    if (erFullfort(punkt)) {
      grupper[1].maal.push(punkt);
    } else if (punkt.dueOn !== null && punkt.dueOn < iDag) {
      grupper[2].maal.push(punkt);
    } else {
      grupper[0].maal.push(punkt);
    }
  }
  const synligeGrupper = grupper.filter((gruppe) => gruppe.maal.length > 0);

  return (
    // overflow-clip, ikke -hidden: hidden gjør seksjonen til scroll-
    // container og dreper sticky-overskriftene (jf. reiselisten).
    <section className="divide-y divide-edge overflow-clip rounded-xl border border-edge bg-card">
      <div className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Fremdriftsmål
        </h2>
        <button
          type="button"
          onClick={onNytt}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
        >
          Nytt mål
        </button>
      </div>

      {maal.length === 0 && (
        <p className="px-4 py-4 text-sm text-ink-3 sm:px-5">
          Ingen mål ennå – sett det første med «Nytt mål». F.eks.: les 12
          bøker i år, invester 80 000 kr i 2026, nå 80 kg.
        </p>
      )}

      {synligeGrupper.map((gruppe) => (
        <Fragment key={gruppe.navn}>
          <h3 className="sticky top-0 z-10 bg-card px-4 py-2.5 text-sm font-medium text-ink sm:px-5">
            {gruppe.navn}
          </h3>
          {gruppe.maal.map((punkt) => (
            <MaalRad
              key={punkt.id}
              maal={punkt}
              logg={logg}
              metrikkNavn={metrikkNavn}
              iDag={iDag}
              onRediger={onRediger}
              onLoggFremdrift={onLoggFremdrift}
            />
          ))}
        </Fragment>
      ))}
    </section>
  );
}

function MaalRad({
  maal,
  logg,
  metrikkNavn,
  iDag,
  onRediger,
  onLoggFremdrift,
}: {
  maal: Goal;
  logg: GoalEntry[];
  metrikkNavn: Map<string, string>;
  iDag: string;
  onRediger: (maal: Goal) => void;
  onLoggFremdrift: (maal: Goal) => void;
}) {
  const erManuell = maal.metricKey === null && maal.countSource === null;
  const innslag = erManuell
    ? logg.filter((rad) => rad.goalId === maal.id)
    : [];
  const andel = fremdriftsandel(maal);
  const igjen = dagerIgjen(maal, iDag);

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-bg/60 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 break-words text-sm font-medium text-ink">
          {maal.title}
        </span>
        <FremdriftsBar andel={andel} />
        <span className="hidden shrink-0 text-xs tabular-nums text-ink-2 sm:inline">
          {fremdriftTekst(maal)}
        </span>
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 self-center text-ink-3 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="px-4 pb-4 sm:px-5">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Detalj
            etikett="Fremdrift"
            verdi={`${fremdriftTekst(maal)}${maal.unit ? ` ${maal.unit}` : ""}${
              andel !== null ? ` (${Math.round(andel * 100)} %)` : ""
            }`}
          />
          <Detalj etikett="Status" verdi={statusTekst(maal, iDag)} />
          <Detalj etikett="Periode" verdi={periodeTekst(maal, igjen)} />
          <Detalj etikett="Sporing" verdi={sporingTekst(maal, metrikkNavn)} />
        </dl>
        {maal.motivation && (
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">
            {maal.motivation}
          </p>
        )}
        {innslag.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-edge pt-3">
            {innslag.map((rad) => (
              <li key={rad.id} className="flex items-baseline gap-3 text-xs">
                <time
                  dateTime={rad.loggedOn}
                  className="w-14 shrink-0 tabular-nums text-ink-3"
                >
                  {formatDatoKort(rad.loggedOn)}
                </time>
                <span className="shrink-0 tabular-nums text-ink-2">
                  {formatTall(rad.value)}
                  {maal.unit ? ` ${maal.unit}` : ""}
                </span>
                <span className="min-w-0 flex-1 break-words text-ink-3">
                  {rad.note}
                </span>
                <SlettFremdriftKnapp id={rad.id} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center justify-end gap-2">
          <SlettMaalKnapp id={maal.id} />
          <button
            type="button"
            onClick={() => onRediger(maal)}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
          >
            Rediger
          </button>
          {erManuell && (
            <button
              type="button"
              onClick={() => onLoggFremdrift(maal)}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
            >
              Logg fremdrift
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

function Detalj({ etikett, verdi }: { etikett: string; verdi: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 text-xs text-ink-3">{etikett}</dt>
      <dd className="min-w-0 break-words text-ink-2">{verdi}</dd>
    </div>
  );
}

function fremdriftTekst(maal: Goal): string {
  if (maal.progressValue === null || maal.targetValue === null) {
    return "–";
  }
  return `${formatTall(maal.progressValue)} av ${formatTall(maal.targetValue)}`;
}

function statusTekst(maal: Goal, iDag: string): string {
  if (erFullfort(maal)) {
    return "Fullført";
  }
  if (maal.dueOn !== null && maal.dueOn < iDag) {
    return "Utløpt";
  }
  const iRute = erIRute(maal, iDag);
  if (iRute === null) {
    return "Aktivt";
  }
  return iRute ? "I rute" : "Bak skjema";
}

function periodeTekst(maal: Goal, igjen: number | null): string {
  const fra = maal.startsOn ? formatDatoKort(maal.startsOn) : "–";
  if (maal.dueOn === null) {
    return `Fra ${fra}`;
  }
  const grunn = `${fra}–${formatDatoKort(maal.dueOn)}`;
  if (igjen === null || igjen < 0) {
    return grunn;
  }
  return `${grunn} · ${igjen} ${igjen === 1 ? "dag" : "dager"} igjen`;
}

function sporingTekst(maal: Goal, metrikkNavn: Map<string, string>): string {
  if (maal.metricKey !== null) {
    return `Automatisk – ${metrikkNavn.get(maal.metricKey) ?? maal.metricKey}`;
  }
  if (maal.countSource === "journal") {
    return "Automatisk – journalinnførsler";
  }
  if (maal.countSource === "reiser") {
    return "Automatisk – reiser";
  }
  if (maal.countSource === "land") {
    return "Automatisk – nye land";
  }
  return "Manuell logg";
}
