"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResultat } from "@/lib/actions";

type Fase = "idle" | "suksess" | "lagret";

// rem, ikke px: da vokser knappen med nettleserens tekstskalering
// (WCAG 1.4.4) i stedet for å klippe etiketten.
const HOYDE = "2.75rem";
const BREDDE_IDLE = "7rem";
const BREDDE_SIRKEL = "2.75rem";
const BREDDE_LAGRET = "8.5rem";

// Egenbygd variant av «SaveToggle»-animasjonen (ui.watermelon.sh), uten
// nye avhengigheter: pillen krymper til en sirkel med spinner mens
// actionen kjører, popper en hake ved suksess, utvider seg til
// «Lagret»-tilstanden og faller tilbake til idle. Fasene styres av ekte
// skjema-status (useFormStatus + actionens resultat), ikke timere alene.
// Knappen deaktiveres ikke under lagring (disabled flytter tastaturfokus
// til body) – dobbelttrykk stoppes i onClick i stedet.
export function LagreKnappAnimert({
  resultat,
  idleTekst,
  lagretTekst,
}: {
  resultat: ActionResultat | undefined;
  idleTekst: string;
  lagretTekst: string;
}) {
  const { pending } = useFormStatus();
  const [fase, setFase] = useState<Fase>("idle");
  const forrigePending = useRef(false);

  useEffect(() => {
    const varPending = forrigePending.current;
    forrigePending.current = pending;
    if (pending) {
      // Nytt innsend (mulig midt i suksessfasen, hvis timere cleanupen
      // nettopp fjernet): nullstill, ellers blir en påfølgende feil
      // stående med hake og «Lagret» ved siden av feilmeldingen.
      setFase("idle");
      return;
    }
    if (varPending && resultat?.ok) {
      setFase("suksess");
      const tilLagret = setTimeout(() => setFase("lagret"), 650);
      const tilIdle = setTimeout(() => setFase("idle"), 2600);
      return () => {
        clearTimeout(tilLagret);
        clearTimeout(tilIdle);
      };
    }
  }, [pending, resultat]);

  const visning: "laster" | Fase = pending ? "laster" : fase;
  // Sirkelfasene inverterer fargene (lys sirkel på mørk flate), som i
  // originalen – ink som bakgrunn, bg som strek/hake.
  const invertert = visning === "laster" || visning === "suksess";
  const bredde = invertert
    ? BREDDE_SIRKEL
    : visning === "lagret"
      ? BREDDE_LAGRET
      : BREDDE_IDLE;

  return (
    <button
      type="submit"
      aria-busy={pending}
      onClick={(e) => {
        if (pending) e.preventDefault();
      }}
      className={`relative overflow-hidden rounded-full border text-sm text-ink transition-[width,background-color,border-color,transform] duration-[450ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.97] motion-reduce:transition-none ${
        invertert
          ? "border-transparent bg-ink"
          : "border-edge bg-bg hover:border-accent"
      }`}
      style={{ width: bredde, height: HOYDE }}
    >
      {/* Stabilt tilgjengelig navn: de visuelle lagene er ren pynt
          (aria-hidden), så navnet kommer herfra og fase-endringer leses
          opp – ellers står en fokusert knapp uten navn under lagring. */}
      <span aria-live="polite" className="sr-only">
        {visning === "laster"
          ? "Lagrer"
          : visning === "suksess" || visning === "lagret"
            ? lagretTekst
            : idleTekst}
      </span>

      <span
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
          visning === "idle" ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
      >
        {idleTekst}
      </span>

      <span
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
          visning === "laster" ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
      >
        <svg viewBox="0 0 26 26" className="h-5 w-5 animate-spin" aria-hidden="true">
          <circle
            cx="13"
            cy="13"
            r="10"
            stroke="var(--color-ink-2)"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M13 3 A10 10 0 0 1 23 13"
            stroke="var(--color-bg)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </span>

      <span
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center gap-2 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${
          visning === "suksess"
            ? "scale-110 opacity-100"
            : visning === "lagret"
              ? "scale-100 opacity-100"
              : "scale-50 opacity-0"
        }`}
      >
        {/* check-circle-fill fra Bootstrap Icons (MIT) som inline SVG. */}
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 transition-colors duration-200 ${
            visning === "suksess" ? "text-bg" : "text-ink-2"
          }`}
        >
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z" />
        </svg>
        {visning === "lagret" && (
          <span className="whitespace-nowrap text-ink-2">{lagretTekst}</span>
        )}
      </span>
    </button>
  );
}
