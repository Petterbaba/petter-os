"use client";

import { useEffect, useState } from "react";

const TEKST = "PETTER-OS";
const AKSENT_FRA = TEKST.indexOf("-"); // «-OS» får aksentfargen, som i ordmerket ellers
const START_MS = 400;
const MS_PER_TEGN = 110;

// Skrivemaskin-innfasing av ordmerket: tegnene kommer ett og ett etter en
// kort pause, med en markørstrek som følger skrivingen og forsvinner når
// teksten er ferdig. Ved redusert bevegelse vises hele teksten med det samme.
export function SkriveLogo() {
  const [antall, setAntall] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAntall(TEKST.length);
      return;
    }
    const timere = Array.from({ length: TEKST.length }, (_, i) =>
      setTimeout(() => setAntall(i + 1), START_MS + (i + 1) * MS_PER_TEGN),
    );
    return () => timere.forEach(clearTimeout);
  }, []);

  const synlig = TEKST.slice(0, antall);
  const ferdig = antall === TEKST.length;

  return (
    <span aria-label={TEKST} className="relative inline-block whitespace-pre">
      {/* Usynlig fulltekst reserverer bredden, så siden ikke flytter seg mens det skrives. */}
      <span aria-hidden className="invisible">
        {TEKST}
      </span>
      <span aria-hidden className="absolute inset-0 text-left">
        {synlig.slice(0, AKSENT_FRA)}
        <span className="text-accent">{synlig.slice(AKSENT_FRA)}</span>
        {!ferdig && (
          <span className="ml-[0.1em] inline-block h-[0.78em] w-[3px] translate-y-[0.06em] bg-accent" />
        )}
      </span>
    </span>
  );
}
