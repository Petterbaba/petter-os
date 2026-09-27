"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { Dinner, DinnerPlan } from "@/lib/types";
import { naeringPerPorsjon } from "@/lib/ernaering";
import { flyttMiddagAction, planleggMiddagAction } from "@/app/mat/actions";
import type { ActionResultat } from "@/lib/actions";
import { UkesmenyKnapp } from "./UkesmenyKnapp";
import { SirkelIkon } from "./SirkelIkon";

// Én dag i den viste uken. Navnene beregnes på serveren og sendes som
// props (jf. landnavn-kommentaren i ReiseUtforsker: Node og nettleser kan
// ha ulike CLDR-versjoner, og et avvik ville gitt hydration-feil).
export type UkeDag = {
  dato: string;
  ukedag: string; // «man» – dagknappene i MiddagDetalj (smale flater)
  ukedagLang: string; // «mandag» – ukesplanens kort og aria-labels
};

// Alle åtte cellene har samme faste høyde: uten den strakk grid-raden seg
// etter «Uken»-kortet når ukesmeny-statusen dukket opp, og rad 1 og 2 fikk
// ulik høyde. Lange titler klippes i stedet (aria-label bærer hele).
const KORT_HOYDE = "h-46 overflow-hidden";

// Ukesplanen som rekke av sju dagsruter pluss et ukessum-kort. Rutene
// utvider seg ikke – klikk åpner dagsvalget i dialogen (eies av
// MatUtforsker), HelloFresh-mønsteret sett fra dagen. Dager med middag
// har en minus-knapp nederst til høyre som fjerner middagen.
//
// Dra-og-slipp (@dnd-kit/core): et kort med middag kan dras til en annen
// dag i uken – ledig dag = flytt, opptatt dag = bytt (avgjøres på
// serveren, se flyttPlanlagtMiddag). Mus starter etter noen pikslers
// bevegelse så vanlige klikk fortsatt åpner dialogen; touch krever et
// kort langt trykk så sveip fortsatt scroller siden. Tastatur har ingen
// dra-sensor (Space/Enter åpner dialogen) – dagsvalget i dialogen dekker
// samme behov. Ingen optimistisk UI (prosjektregel): kortene står til
// serveren har svart og siden er revalidert, markert som «flytter».
export function UkesplanKort({
  dager,
  planer,
  middager,
  iDag,
  ukeNummer,
  forrigeUke,
  nesteUke,
  erDenneUken,
  onVelgDag,
}: {
  dager: UkeDag[];
  planer: DinnerPlan[];
  middager: Dinner[];
  iDag: string;
  ukeNummer: number;
  forrigeUke: string;
  nesteUke: string;
  erDenneUken: boolean;
  onVelgDag: (dag: UkeDag) => void;
}) {
  const planPerDag = new Map(planer.map((plan) => [plan.plannedOn, plan]));
  const middagPerId = new Map(middager.map((middag) => [middag.id, middag]));
  const middagFor = (dato: string) => {
    const plan = planPerDag.get(dato);
    return plan === undefined ? undefined : middagPerId.get(plan.dinnerId);
  };

  const [draes, setDraes] = useState<string | null>(null);
  const [flytting, setFlytting] = useState<{ fra: string; til: string } | null>(
    null,
  );
  const [feil, setFeil] = useState<string | null>(null);
  const [venter, startFlytting] = useTransition();
  // Et slipp på samme kort som dra startet fra gir et click-event etterpå;
  // det skal ikke åpne dialogen.
  const sisteSlipp = useRef(0);

  const sensorer = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 6 },
    }),
  );

  function vedDraStart(hendelse: DragStartEvent) {
    setFeil(null);
    setDraes(String(hendelse.active.id));
  }

  function vedDraSlutt(hendelse: DragEndEvent) {
    setDraes(null);
    sisteSlipp.current = Date.now();
    const fra = String(hendelse.active.id);
    const til = hendelse.over === null ? null : String(hendelse.over.id);
    if (til === null || til === fra) {
      return;
    }
    setFlytting({ fra, til });
    startFlytting(async () => {
      const resultat = await flyttMiddagAction(fra, til);
      if (!resultat.ok) {
        setFeil(resultat.melding);
      }
      setFlytting(null);
    });
  }

  // Ukens næringsbilde: snitt per porsjon over dagene som både er planlagt
  // og kan beregnes (naeringPerPorsjon svarer null ellers).
  const planlagte = planer.filter((plan) => middagPerId.has(plan.dinnerId));
  const beregnede = planlagte
    .map((plan) => naeringPerPorsjon(middagPerId.get(plan.dinnerId)!))
    .filter((naering) => naering !== null);
  const snittKcal =
    beregnede.length === 0
      ? null
      : beregnede.reduce((sum, naering) => sum + naering.kcal, 0) /
        beregnede.length;
  const snittProtein =
    beregnede.length === 0
      ? null
      : beregnede.reduce((sum, naering) => sum + naering.proteinG, 0) /
        beregnede.length;

  const draDag =
    draes === null ? undefined : dager.find((dag) => dag.dato === draes);
  const draMiddag = draes === null ? undefined : middagFor(draes);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          Ukesplan · uke {ukeNummer}
        </h2>
        <nav aria-label="Ukenavigasjon" className="flex items-baseline gap-3 text-xs">
          <Link
            href={`/mat?uke=${forrigeUke}`}
            className="text-ink-3 transition-colors hover:text-ink"
          >
            ‹ forrige
          </Link>
          {!erDenneUken && (
            <Link
              href="/mat"
              className="text-ink-3 underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
            >
              denne uken
            </Link>
          )}
          <Link
            href={`/mat?uke=${nesteUke}`}
            className="text-ink-3 transition-colors hover:text-ink"
          >
            neste ›
          </Link>
        </nav>
      </div>

      {/* Fast id: dnd-kits autogenererte id-er avviker mellom server og
          klient og gir ellers hydration-advarsel. */}
      <DndContext
        id="ukesplan"
        sensors={sensorer}
        onDragStart={vedDraStart}
        onDragEnd={vedDraSlutt}
        onDragCancel={() => setDraes(null)}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dager.map((dag) => (
            <DagRute
              key={dag.dato}
              dag={dag}
              middag={middagFor(dag.dato)}
              erIDag={dag.dato === iDag}
              flytter={
                venter &&
                flytting !== null &&
                (flytting.fra === dag.dato || flytting.til === dag.dato)
              }
              laast={venter}
              onKlikk={() => {
                if (Date.now() - sisteSlipp.current < 300) {
                  return;
                }
                onVelgDag(dag);
              }}
              onFeil={setFeil}
            />
          ))}

          {/* Ukessummen er avledet, ikke en dag – stiplet kant skiller den.
              Ukesmeny-knappen bor her: den handler om uken, ikke én dag. */}
          <div
            className={`flex ${KORT_HOYDE} flex-col gap-2 rounded-xl border border-dashed border-edge p-3`}
          >
            <span className="text-xs uppercase tracking-widest text-ink-3">
              Uken
            </span>
            <p className="text-xl font-semibold tabular-nums leading-none text-ink">
              {planlagte.length}
              <span className="text-sm font-normal text-ink-3">
                {" "}
                / {dager.length}
              </span>
            </p>
            <p className="text-xs text-ink-3">dager planlagt</p>
            <p className="text-xs tabular-nums text-ink-3">
              {snittKcal !== null && snittProtein !== null
                ? `snitt ${Math.round(snittKcal)} kcal · ${Math.round(
                    snittProtein,
                  )} g protein`
                : " "}
            </p>
            <UkesmenyKnapp
              mandag={dager[0].dato}
              ledigeDager={dager.length - planlagte.length}
            />
          </div>
        </div>

        {/* Kortet som følger pekeren. Ingen slipp-animasjon: kortet skal
            ikke «fly tilbake» mens serveren flytter det. */}
        <DragOverlay dropAnimation={null}>
          {draDag !== undefined && draMiddag !== undefined ? (
            <div className="flex h-full cursor-grabbing flex-col gap-2 rounded-xl border border-accent bg-card p-3 shadow-xl">
              <span className="text-xs uppercase tracking-widest text-ink-3">
                {draDag.ukedagLang}
              </span>
              <span className="line-clamp-3 break-words text-sm leading-snug text-ink">
                {draMiddag.title}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {feil !== null && (
        <p role="alert" className="mt-2 text-xs text-ink-3">
          {feil}
        </p>
      )}
    </section>
  );
}

// Én dagsrute: både slippmål (alle dager) og drabar (kun med middag).
//
// Dager med middag får en minus-knapp nederst til høyre som fjerner
// middagen direkte. Den ligger UTENFOR kortknappen – en <button> kan ikke
// ligge i en annen – og legges oppå hjørnet; kortet holder av plassen så
// tallene brytes før den. (Plusset for å legge til bor i dagsvalget.)
// Ingen bekreftelse: planlegging er billig å angre (UkesmenyKnapp-
// presedensen).
function DagRute({
  dag,
  middag,
  erIDag,
  flytter,
  laast,
  onKlikk,
  onFeil,
}: {
  dag: UkeDag;
  middag: Dinner | undefined;
  erIDag: boolean;
  flytter: boolean;
  laast: boolean;
  onKlikk: () => void;
  onFeil: (melding: string | null) => void;
}) {
  const [resultat, fjernHandling, fjerner] = useActionState<
    ActionResultat | undefined,
    FormData
  >(planleggMiddagAction, undefined);

  useEffect(() => {
    if (resultat !== undefined && !resultat.ok) {
      onFeil(resultat.melding);
    }
  }, [resultat, onFeil]);

  const {
    setNodeRef: settSlippRef,
    isOver,
    active,
  } = useDroppable({ id: dag.dato, disabled: laast });
  const {
    setNodeRef: settDraRef,
    listeners,
    isDragging,
  } = useDraggable({
    id: dag.dato,
    disabled: middag === undefined || laast || fjerner,
  });
  const settRef = useCallback(
    (node: HTMLElement | null) => {
      settSlippRef(node);
      settDraRef(node);
    },
    [settSlippRef, settDraRef],
  );

  const naering = middag === undefined ? null : naeringPerPorsjon(middag);
  const erMaal = isOver && active !== null && active.id !== dag.dato;
  const dato = Number(dag.dato.slice(8, 10));
  const opptatt = flytter || fjerner;

  return (
    <div
      aria-busy={opptatt}
      className={`relative min-w-0 ${isDragging ? "opacity-40" : ""} ${
        opptatt ? "animate-pulse" : ""
      }`}
    >
      <button
        ref={settRef}
        type="button"
        // Kun dra-lytterne spres – ikke dnd-kits aria-attributter, som ville
        // lovet tastaturdraing vi ikke tilbyr.
        {...listeners}
        onClick={onKlikk}
        aria-label={`${dag.ukedagLang} ${dato}. – ${
          middag === undefined ? "velg middag" : `${middag.title}, bytt middag`
        }`}
        title={
          middag === undefined ? undefined : "Dra til en annen dag for å flytte"
        }
        className={`flex ${KORT_HOYDE} w-full min-w-0 touch-manipulation select-none flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-colors [-webkit-touch-callout:none] hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
          erIDag || erMaal ? "border-accent" : "border-edge"
        } ${erMaal ? "bg-accent/10" : ""}`}
      >
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={`text-xs uppercase tracking-widest ${
              erIDag ? "font-medium text-ink" : "text-ink-3"
            }`}
          >
            {dag.ukedagLang}
          </span>
          <span className="text-xl font-semibold tabular-nums leading-none text-ink">
            {dato}
          </span>
        </span>
        <span
          className={`line-clamp-3 break-words text-sm leading-snug ${
            middag === undefined ? "text-ink-3" : "text-ink"
          }`}
        >
          {middag?.title ?? "Velg middag"}
        </span>
        <span className="mt-auto flex items-end justify-between gap-1.5">
          {/* To deler så linjen brytes pent på smale kort (mobil). */}
          <span className="flex min-w-0 flex-wrap gap-x-1 text-xs tabular-nums text-ink-3">
            {naering === null ? (
              " "
            ) : (
              <>
                <span>{Math.round(naering.kcal)} kcal ·</span>
                <span>{Math.round(naering.proteinG)} g protein</span>
              </>
            )}
          </span>
          {/* Avholdt plass for minus-knappen: 28 px som stikker 6 px ut i
              paddingen (-m-1.5), så ikonet flukter med innholdskanten. */}
          {middag !== undefined && (
            <span aria-hidden="true" className="-m-1.5 h-7 w-7 shrink-0" />
          )}
        </span>
      </button>

      {middag !== undefined && (
        // 7 px = kortets 1 px kant + 12 px padding − 6 px (ikonplassens
        // negative marg): ligger nøyaktig over den avholdte plassen.
        <form
          action={fjernHandling}
          onSubmit={() => onFeil(null)}
          className="absolute bottom-[7px] right-[7px]"
        >
          <input type="hidden" name="dato" value={dag.dato} />
          <input type="hidden" name="middag" value="" />
          <button
            type="submit"
            disabled={fjerner || laast}
            aria-label={`Fjern ${middag.title} fra ${dag.ukedagLang}`}
            title="Fjern middagen fra dagen"
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-bg hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:opacity-50"
          >
            <SirkelIkon tegn="minus" />
          </button>
        </form>
      )}
    </div>
  );
}
