"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";

// Støtte endrer seg aldri i løpet av sidens liv – ingen abonnement.
function ingenAbonnement() {
  return () => {};
}

function harWakeLock() {
  return "wakeLock" in navigator;
}

// «Hold skjermen på» under matlaging – som bryteren i Oda-appen (brukerens
// valg sep. 2026: av som standard, slås på manuelt, aldri automatisk).
// Screen Wake Lock API krever sikker kontekst (HTTPS/localhost) og synlig
// side: nettleseren slipper låsen selv når fanen skjules, så den bes om
// på nytt når siden blir synlig igjen mens bryteren står på. Når
// matlagingsblokken avmonteres (økten er ferdig), slipper cleanup låsen.
export function SkjermBryter() {
  const etikettId = useId();
  // Server-snapshot false: bryteren rendres deaktivert til klienten vet
  // svaret (ingen hydration-avvik).
  const stottet = useSyncExternalStore(ingenAbonnement, harWakeLock, () => false);
  const [paa, setPaa] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);

  useEffect(() => {
    if (!paa) {
      return;
    }
    let laas: WakeLockSentinel | null = null;
    let avbrutt = false;

    async function beOmLaas() {
      try {
        const ny = await navigator.wakeLock.request("screen");
        if (avbrutt) {
          await ny.release();
          return;
        }
        laas = ny;
      } catch {
        // Nektet (f.eks. strømsparing) – vis det ærlig og slå av bryteren.
        if (!avbrutt) {
          setPaa(false);
          setFeil("Nettleseren tillot ikke å holde skjermen på.");
        }
      }
    }

    function vedSynlighet() {
      if (
        document.visibilityState === "visible" &&
        (laas === null || laas.released)
      ) {
        void beOmLaas();
      }
    }

    void beOmLaas();
    document.addEventListener("visibilitychange", vedSynlighet);
    return () => {
      avbrutt = true;
      document.removeEventListener("visibilitychange", vedSynlighet);
      void laas?.release();
    };
  }, [paa]);

  const status = !stottet
    ? "Støttes ikke i denne nettleseren."
    : feil ?? (paa ? "Skjermen holdes på." : null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span id={etikettId} className="text-xs text-ink-2">
          Hold skjermen på
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={paa}
          aria-labelledby={etikettId}
          disabled={!stottet}
          onClick={() => {
            setFeil(null);
            setPaa((forrige) => !forrige);
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 motion-reduce:transition-none ${
            paa ? "border-accent bg-accent" : "border-edge bg-bg"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-4 w-4 rounded-full transition-transform motion-reduce:transition-none ${
              paa ? "translate-x-6 bg-card" : "translate-x-1 bg-ink-3"
            }`}
          />
        </button>
      </div>
      {status !== null && (
        <p role="status" className="mt-1 text-xs text-ink-3">
          {status}
        </p>
      )}
    </div>
  );
}
