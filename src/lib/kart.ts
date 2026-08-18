import { readFileSync } from "node:fs";
import path from "node:path";

// Verdenskartet er en vendored SVG (CC BY-SA 3.0, Al MacDonald / Fritz
// Lekschas – attribusjonen ligger i SVG-ens <desc> og skal bli der).
// Landene har id = ISO 3166-1 alfa-2 i små bokstaver; paths med "_"-prefiks
// mangler ISO-kode og behandles ikke som land. Kun server-side (fs).
const KART_STI = path.join(process.cwd(), "src", "lib", "kart", "verdenskart.svg");

let hurtigbuffer: { svg: string; landkoder: string[] } | null = null;

export function lesVerdenskart(): { svg: string; landkoder: string[] } {
  if (!hurtigbuffer) {
    const raa = readFileSync(KART_STI, "utf8");
    // Kutt XML-prolog/doctype – strengen skal inlines i siden.
    const svg = raa.slice(raa.indexOf("<svg"));
    const landkoder = [
      ...new Set(Array.from(svg.matchAll(/ id="([a-z]{2})"/g), (m) => m[1])),
    ].sort();
    hurtigbuffer = { svg, landkoder };
  }
  return hurtigbuffer;
}

// Merker alle land som klikkbare og de besøkte med egen klasse, så
// stylingen bor i CSS (globals: .reisekart). Klassen havner på elementet
// som bærer id-en – en <path> for de fleste land, en <g> for de 37 som
// er grupper. Strengbasert med vilje – ingen DOM-parser på serveren, og
// ingen id-bærende elementer har class fra før (verifisert ved
// innlemming; enkelte id-løse barne-paths har class="mainland" o.l.,
// men de berøres ikke av regexen).
export function prosesserKart(svg: string, besokte: Set<string>): string {
  return svg.replace(
    / id="([a-z]{2})"/g,
    (_treff, kode: string) =>
      ` id="${kode}" class="klikkbar${besokte.has(kode) ? " besokt" : ""}"`,
  );
}
