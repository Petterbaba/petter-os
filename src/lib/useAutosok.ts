import { useCallback, useEffect, useRef, useState, useTransition } from "react";

// Autosøk-mønsteret (matflyt-planen, 6. sep 2026): søker automatisk
// ~300 ms etter siste tastetrykk – ingen «Søk»-knapp. Ref-telleren
// forkaster svar som kommer tilbake i feil rekkefølge; under to tegn
// søkes det ikke, og trefflisten nullstilles i input-handleren.
// Importeres kun av klientkomponenter (ingrediens-søkene i editoren).
export function useAutosok<T>(
  hentTreff: (
    term: string,
  ) => Promise<{ ok: true; treff: T[] } | { ok: false; melding: string }>,
  initialSok = "",
) {
  const [sok, setSok] = useState(initialSok);
  const [treff, setTreff] = useState<T[] | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [soker, startSok] = useTransition();
  const sokNr = useRef(0);

  const utforSok = useCallback(
    (term: string) => {
      const nr = ++sokNr.current;
      startSok(async () => {
        const svar = await hentTreff(term);
        if (nr !== sokNr.current) {
          return; // et nyere søk er alt underveis
        }
        if (svar.ok) {
          setTreff(svar.treff);
          setMelding(svar.treff.length === 0 ? "Ingen treff." : null);
        } else {
          setTreff(null);
          setMelding(svar.melding);
        }
      });
    },
    [hentTreff, startSok],
  );

  useEffect(() => {
    const term = sok.trim();
    if (term.length < 2) {
      return;
    }
    const timer = setTimeout(() => utforSok(term), 300);
    return () => clearTimeout(timer);
  }, [sok, utforSok]);

  function oppdaterSok(verdi: string) {
    setSok(verdi);
    if (verdi.trim().length < 2) {
      sokNr.current++; // forkast ev. svar som er underveis
      setTreff(null);
      setMelding(null);
    }
  }

  return { sok, oppdaterSok, treff, melding, soker };
}
