"use client";

import {
  useActionState,
  useId,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  avsluttOktAction,
  fortsettOktAction,
  pauseOktAction,
  settStegAction,
  slettOktAction,
  startOktAction,
} from "@/app/kokebok/actions";
import type { CookingSession, Dinner, DinnerStep } from "@/lib/types";
import type { ActionResultat } from "@/lib/actions";
import {
  formatKlokke,
  formatVarighet,
  nesteSteg,
  sekunderBrukt,
} from "@/lib/matlaging";
import { SkjermBryter } from "./SkjermBryter";

type OktAction = (
  forrige: ActionResultat | undefined,
  formData: FormData,
) => Promise<ActionResultat>;

// Matlagingsmodus på oppskriftssiden (brukerens valg sep. 2026: samme
// side, ingen egen rute). Uten økt: «Start matlaging» + stegene som
// les-kun liste. Med økt: et kompakt timerkort festes øverst (Pause/
// Fortsett og Avbryt), hvert steg blir et avkryssingskort, og «Ferdig»
// står nederst under stegene. Bare ferdige økter lagres: «Ferdig» eller
// siste avhukede steg lagrer tiden, «Avbryt» sletter økten. Tilstanden
// kommer ALLTID fra server-props (ingen optimistisk UI). Ingredienser og
// næring kommer inn som slot mellom timeren og stegene.
export function Matlaging({
  middag,
  aktivOkt,
  gjorteStegIder,
  sisteOktTekst,
  children,
}: {
  middag: Dinner;
  aktivOkt: CookingSession | null;
  gjorteStegIder: string[];
  sisteOktTekst: string | null;
  children: ReactNode;
}) {
  const gjorte = new Set(gjorteStegIder);
  const neste = aktivOkt === null ? null : nesteSteg(middag.steps, gjorte);
  const antallGjort = middag.steps.filter((steg) => gjorte.has(steg.id)).length;
  const pauset = aktivOkt !== null && aktivOkt.pausedAt !== null;

  return (
    <div className="flex flex-col gap-6">
      {aktivOkt === null ? (
        <section className="rounded-xl border border-edge bg-card p-4 sm:p-5">
          <StartKnapp middagId={middag.id} />
          <p role="status" className="mt-2 text-xs text-ink-3">
            {sisteOktTekst ?? "Ikke laget ennå."}
          </p>
        </section>
      ) : (
        <section
          aria-label="Matlaging pågår"
          className="sticky top-0 z-10 rounded-xl border border-accent bg-card/95 px-4 py-3 backdrop-blur"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex items-baseline gap-3">
              <OktTimer okt={aktivOkt} />
              <span className="text-xs tabular-nums text-ink-3">
                {pauset
                  ? "Pause"
                  : middag.cookMinutes === null
                    ? "Oppskriften har ingen tid"
                    : `av ${formatVarighet(middag.cookMinutes)}`}
                {middag.steps.length > 0 &&
                  ` · ${antallGjort}/${middag.steps.length} steg`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <OktKnapp
                action={pauset ? fortsettOktAction : pauseOktAction}
                oktId={aktivOkt.id}
                middagId={middag.id}
                tekst={pauset ? "Fortsett" : "Pause"}
                venteTekst={pauset ? "Fortsetter …" : "Pauser …"}
              />
              <OktKnapp
                action={slettOktAction}
                oktId={aktivOkt.id}
                middagId={middag.id}
                tekst="Avbryt"
                venteTekst="Avbryter …"
                bekreft="Avbryte matlagingen? Tiden lagres ikke."
              />
            </div>
          </div>
          <div className="mt-2 border-t border-edge pt-2">
            <SkjermBryter />
          </div>
        </section>
      )}

      {children}

      <section>
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Fremgangsmåte
        </h2>
        {middag.steps.length === 0 ? (
          <p className="mt-2 text-sm text-ink-3">
            Oppskriften har ingen steg ennå – legg dem til under Rediger.
          </p>
        ) : aktivOkt === null ? (
          <>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2 marker:text-ink-3">
              {middag.steps.map((steg) => (
                <li key={steg.id} className="whitespace-pre-line break-words pl-1">
                  {steg.body}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-ink-3">
              Start matlaging for å huke av stegene.
            </p>
          </>
        ) : (
          <ol className="mt-2 flex flex-col gap-2">
            {middag.steps.map((steg, indeks) => (
              <OktSteg
                key={steg.id}
                oktId={aktivOkt.id}
                middagId={middag.id}
                steg={steg}
                nr={indeks + 1}
                gjort={gjorte.has(steg.id)}
                erNeste={neste?.id === steg.id}
              />
            ))}
          </ol>
        )}

        {aktivOkt !== null && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <OktKnapp
              action={avsluttOktAction}
              oktId={aktivOkt.id}
              middagId={middag.id}
              tekst="Ferdig – lagre tiden"
              venteTekst="Lagrer …"
              fremhevet
            />
            {middag.steps.length > 0 && (
              <p className="text-xs text-ink-3">
                Tiden lagres også når du huker av siste steg.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// --- Timeren ----------------------------------------------------------------
// Hydration-sikker tikking uten setState i en effect (lint-regelen
// react-hooks/set-state-in-effect): useSyncExternalStore som Klokke, men
// med ETT delt sekund-lager som oppdateres KUN i abonnementet – aldri i
// getSnapshot, så to kall i samme render alltid gir samme verdi (Reacts
// «getSnapshot should be cached»-sjekk). Serveren rendrer «––:––».

let naaSekunder = Math.floor(Date.now() / 1000);

function abonnerPaaSekunder(varsle: () => void) {
  // Ferskt ved (re)montering – React leser snapshot på nytt rett etter
  // abonnering og tegner om hvis verdien har endret seg.
  naaSekunder = Math.floor(Date.now() / 1000);
  const id = setInterval(() => {
    naaSekunder = Math.floor(Date.now() / 1000);
    varsle();
  }, 1000);
  return () => clearInterval(id);
}

function lesSekunder() {
  return naaSekunder;
}

function lesSekunderServer() {
  return null;
}

// Under pause står klokken stille (sekunderBrukt regner fra pausestarten).
// Ingen live-region: et tall som endres hvert sekund ville blitt lest opp
// 60 ganger i minuttet. Navnet sier hva tallet er.
function OktTimer({ okt }: { okt: CookingSession }) {
  const naa = useSyncExternalStore(
    abonnerPaaSekunder,
    lesSekunder,
    lesSekunderServer,
  );

  return (
    <p
      aria-label="Tid brukt"
      className={`text-2xl font-semibold leading-none tabular-nums ${
        okt.pausedAt === null ? "text-ink" : "text-ink-3"
      }`}
    >
      {naa === null ? "––:––" : formatKlokke(sekunderBrukt(okt, naa))}
    </p>
  );
}

// --- Knappene ---------------------------------------------------------------
// Alle bruker aria-busy + onClick-vakt mens de venter, aldri disabled
// (LagreKnappAnimert-regelen: disabled flytter tastaturfokus til body).

function StartKnapp({ middagId }: { middagId: string }) {
  const [resultat, handling, venter] = useActionState<
    ActionResultat | undefined,
    FormData
  >(startOktAction, undefined);

  return (
    <form action={handling} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="middag" value={middagId} />
      <button
        type="submit"
        aria-busy={venter}
        onClick={(hendelse) => {
          if (venter) hendelse.preventDefault();
        }}
        className="rounded-full border border-accent px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent/10 aria-busy:opacity-60"
      >
        {venter ? "Starter …" : "Start matlaging"}
      </button>
      {resultat && !resultat.ok && (
        <span role="alert" className="text-xs text-ink-3">
          {resultat.melding}
        </span>
      )}
    </form>
  );
}

// Én knapp = én liten form mot en økt-action (pause, fortsett, avbryt,
// ferdig). «bekreft» gir native confirm() som angrevern (SlettJournal-
// Knapp-mønsteret) før handlinger som ikke kan angres.
function OktKnapp({
  action,
  oktId,
  middagId,
  tekst,
  venteTekst,
  bekreft,
  fremhevet = false,
}: {
  action: OktAction;
  oktId: string;
  middagId: string;
  tekst: string;
  venteTekst: string;
  bekreft?: string;
  fremhevet?: boolean;
}) {
  const [resultat, handling, venter] = useActionState<
    ActionResultat | undefined,
    FormData
  >(action, undefined);

  return (
    <form
      action={handling}
      onSubmit={(hendelse) => {
        if (bekreft !== undefined && !window.confirm(bekreft)) {
          hendelse.preventDefault();
        }
      }}
      className="flex flex-col items-start gap-1"
    >
      <input type="hidden" name="okt" value={oktId} />
      <input type="hidden" name="middag" value={middagId} />
      <button
        type="submit"
        aria-busy={venter}
        onClick={(hendelse) => {
          if (venter) hendelse.preventDefault();
        }}
        className={`rounded-full border text-ink transition-colors aria-busy:opacity-60 ${
          fremhevet
            ? "border-accent px-5 py-2.5 text-sm font-medium hover:bg-accent/10"
            : "border-edge px-3 py-1.5 text-xs hover:border-accent"
        }`}
      >
        {venter ? venteTekst : tekst}
      </button>
      {resultat && !resultat.ok && (
        <span role="alert" className="text-xs text-ink-3">
          {resultat.melding}
        </span>
      )}
    </form>
  );
}

// --- Ett steg i en pågående økt ---------------------------------------------
// Hvert steg er sitt eget kort (luft mellom trykkflatene). «Avkryssings-
// boks som form» (PlanleggKnapp-presedensen for formen): HELE kortet er
// knappen – en telefon ved komfyren trenger en stor trykkflate.
// Tilgjengelig navn = stegteksten (rute og nummer er aria-hidden);
// «Neste» ligger utenfor knappen så den ikke blir del av navnet.
// «gjort»-feltet er målverdien, så et dobbelttrykk aldri snur tilbake.
function OktSteg({
  oktId,
  middagId,
  steg,
  nr,
  gjort,
  erNeste,
}: {
  oktId: string;
  middagId: string;
  steg: DinnerStep;
  nr: number;
  gjort: boolean;
  erNeste: boolean;
}) {
  const [resultat, handling, venter] = useActionState<
    ActionResultat | undefined,
    FormData
  >(settStegAction, undefined);
  const tekstId = useId();

  return (
    <li
      aria-current={erNeste ? "step" : undefined}
      className={`flex items-start gap-2 rounded-xl border px-3 transition-colors sm:px-4 ${
        erNeste ? "border-accent bg-card" : gjort ? "border-edge bg-bg" : "border-edge bg-card"
      }`}
    >
      <form action={handling} className="min-w-0 flex-1">
        <input type="hidden" name="okt" value={oktId} />
        <input type="hidden" name="middag" value={middagId} />
        <input type="hidden" name="steg" value={steg.id} />
        <input type="hidden" name="gjort" value={gjort ? "0" : "1"} />
        <button
          type="submit"
          role="checkbox"
          aria-checked={gjort}
          aria-busy={venter}
          aria-labelledby={tekstId}
          onClick={(hendelse) => {
            if (venter) hendelse.preventDefault();
          }}
          className="flex min-h-11 w-full items-start gap-3 rounded-md py-3 text-left transition-opacity focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent aria-busy:opacity-60"
        >
          <span
            aria-hidden="true"
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors ${
              gjort ? "border-accent bg-accent text-card" : "border-axis bg-bg"
            }`}
          >
            {gjort && (
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M3.5 8.5l3 3 6-7" />
              </svg>
            )}
          </span>
          <span
            aria-hidden="true"
            className="w-5 shrink-0 pt-0.5 text-right text-sm tabular-nums text-ink-3"
          >
            {nr}.
          </span>
          <span
            id={tekstId}
            className={`min-w-0 flex-1 whitespace-pre-line break-words text-sm leading-relaxed ${
              gjort ? "text-ink-3 line-through" : "text-ink"
            }`}
          >
            {steg.body}
          </span>
        </button>
        {resultat && !resultat.ok && (
          <p role="alert" className="pb-2 text-xs text-ink-3">
            {resultat.melding}
          </p>
        )}
      </form>
      {erNeste && (
        <span className="mt-3.5 shrink-0 rounded-full border border-accent px-2 py-0.5 text-[0.65rem] uppercase tracking-widest text-ink-2">
          Neste
        </span>
      )}
    </li>
  );
}
