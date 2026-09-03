import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { hentOdaToken } from "@/lib/oda/oauth";
import {
  lagreOdaTilkobling,
  lesOdaFlyt,
  slettOdaFlyt,
} from "@/lib/oda/tilkobling";

// Appens eneste route handler: OAuth-callbacken fra Oda må være en GET-
// URL (server actions kan ikke være redirect-mål). Proxyen krever
// innlogging som overalt ellers. Flyt-cookien (state + PKCE-verifier)
// ble satt av kobleTilOdaAction og forbrukes her uansett utfall.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const flyt = await lesOdaFlyt();
  await slettOdaFlyt();

  let status: "koblet" | "feil" = "feil";
  if (
    params.get("error") === null &&
    code !== null &&
    state !== null &&
    flyt !== null &&
    flyt.state === state
  ) {
    try {
      const token = await hentOdaToken({
        clientId: flyt.clientId,
        code,
        verifier: flyt.verifier,
        redirectUri: flyt.redirectUri,
      });
      await lagreOdaTilkobling({ clientId: flyt.clientId, ...token });
      status = "koblet";
    } catch (feil) {
      // Generisk melding i UI; detaljer kun i serverloggen.
      console.error("Oda-tilkobling feilet:", feil);
    }
  } else {
    console.error("Oda-callback avvist:", params.get("error") ?? "state/kode mangler");
  }

  redirect(`/mat?oda=${status}`);
}
