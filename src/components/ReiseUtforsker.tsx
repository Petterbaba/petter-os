"use client";

import { useEffect, useRef, useState } from "react";
import type { Trip } from "@/lib/types";
import { ReiseSkjema } from "./ReiseSkjema";
import { ReiseListe } from "./ReiseListe";

// Binder kartet, registrerings-dialogen og listen sammen. Kartet er
// primærinngangen: klikk på et land åpner dialogen med landet forhånds-
// valgt; «Ny reise»-knappen åpner samme dialog for manuell registrering.
// Valgt land er delt tilstand – det markerer kartet, filtrerer listen og
// styrer skjemaets land-felt. Kart-SVG-en er prosessert server-side
// (klasser for besøkt/klikkbar) og injiseres som HTML; React eier den
// ikke, så valgt-markeringen settes med DOM-klasser.
export function ReiseUtforsker({
  kartHtml,
  land,
  reiser,
  standardDato,
}: {
  kartHtml: string;
  land: { kode: string; navn: string }[];
  reiser: Trip[];
  standardDato: string;
}) {
  const [valgtLand, setValgtLand] = useState<string | null>(null);
  const [redigerReise, setRedigerReise] = useState<Trip | null>(null);
  const kartRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Synk valgt-markeringen inn i den injiserte SVG-en. Id-en kan sitte på
  // en <path> ELLER en <g> (37 land er grupper), så oppslaget er
  // elementagnostisk. valgtLand er alltid regex-/listevalidert, så
  // interpolasjonen i selektoren er trygg. kartHtml i avhengighetslisten:
  // etter lagring re-rendres kartet (nye besøkt-klasser fra serveren),
  // og markeringen må settes på nytt.
  useEffect(() => {
    const rot = kartRef.current;
    if (!rot) return;
    rot.querySelectorAll(".valgt").forEach((element) =>
      element.classList.remove("valgt"),
    );
    if (valgtLand) {
      rot.querySelector(`[id="${valgtLand}"]`)?.classList.add("valgt");
    }
  }, [valgtLand, kartHtml]);

  const besokteLand = new Set(reiser.map((reise) => reise.countryCode));
  const filtrerteReiser = valgtLand
    ? reiser.filter((reise) => reise.countryCode === valgtLand)
    : reiser;

  // Landnavn slås opp i den SERVER-beregnede listen, aldri i klientens
  // Intl.DisplayNames: Node og nettleser kan ha ulike CLDR-versjoner
  // (Swaziland/Eswatini o.l.), og avviket ville gitt hydration-feil.
  const navnPerKode = new Map(land.map((alternativ) => [alternativ.kode, alternativ.navn]));
  const navnFor = (kode: string) => navnPerKode.get(kode) ?? kode.toUpperCase();

  function aapneDialog(kode: string | null) {
    setRedigerReise(null);
    if (kode !== null) {
      setValgtLand(kode);
    }
    dialogRef.current?.showModal();
  }

  function aapneRediger(reise: Trip) {
    setRedigerReise(reise);
    setValgtLand(reise.countryCode);
    dialogRef.current?.showModal();
  }

  function lukkDialog() {
    dialogRef.current?.close();
  }

  function haandterKartKlikk(hendelse: React.MouseEvent) {
    // closest(".klikkbar"), ikke closest("path"): for gruppe-landene er
    // pathen man treffer id-løs, og landkoden sitter på <g>-forelderen.
    const element = (hendelse.target as Element).closest(".klikkbar");
    if (!element || !/^[a-z]{2}$/.test(element.id)) return;
    aapneDialog(element.id);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-edge bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
            Kart
          </h2>
          <div className="flex items-baseline gap-4">
            <p className="text-xs tabular-nums text-ink-3">
              {besokteLand.size} land · {reiser.length}{" "}
              {reiser.length === 1 ? "reise" : "reiser"}
            </p>
            <button
              type="button"
              onClick={() => aapneDialog(null)}
              className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink transition-colors hover:border-accent"
            >
              Ny reise
            </button>
          </div>
        </div>
        <div
          ref={kartRef}
          onClick={haandterKartKlikk}
          className="reisekart"
          role="img"
          aria-label="Verdenskart over besøkte land"
          dangerouslySetInnerHTML={{ __html: kartHtml }}
        />
        <p className="mt-2 text-xs text-ink-3">
          {valgtLand ? (
            <>
              Viser {navnFor(valgtLand)} ·{" "}
              <button
                type="button"
                onClick={() => setValgtLand(null)}
                className="underline decoration-edge underline-offset-2 transition-colors hover:text-ink"
              >
                vis alle
              </button>
            </>
          ) : (
            "Klikk på et land for å registrere en reise dit – eller bruk «Ny reise»."
          )}
        </p>
      </section>

      {/* Registrerings-dialogen: native <dialog> gir fokusfelle, Esc og
          bakteppe uten avhengigheter. Klikk på bakteppet lukker (target er
          selve dialog-elementet kun når klikket traff utenfor innholdet). */}
      <dialog
        ref={dialogRef}
        onClick={(hendelse) => {
          if (hendelse.target === dialogRef.current) {
            lukkDialog();
          }
        }}
        onClose={() => setRedigerReise(null)}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-edge bg-card p-0 text-ink backdrop:bg-black/60"
      >
        {/* Ny key per mål: useState-initialverdiene (vurdering m.m.)
            leses på nytt når man bytter mellom ny/rediger. */}
        <ReiseSkjema
          key={redigerReise?.id ?? "ny"}
          land={land}
          valgtLand={valgtLand}
          onLandChange={setValgtLand}
          standardDato={standardDato}
          rediger={redigerReise ?? undefined}
          onAvbryt={lukkDialog}
          onLagret={lukkDialog}
        />
      </dialog>

      <ReiseListe
        reiser={filtrerteReiser}
        navnFor={navnFor}
        onRediger={aapneRediger}
      />
    </div>
  );
}
