// Tema: mørkt (svart/gull) er standard, lyst (Claude-paletten) veksles
// til med TemaKnapp. Begge palettene bor i globals.css (light-dark()
// per token); cookien styrer bare color-scheme via data-theme.
export const TEMA_COOKIE = "tema";

export type Tema = "mork" | "lys";

export function lesTema(verdi: string | undefined): Tema {
  return verdi === "lys" ? "lys" : "mork";
}
