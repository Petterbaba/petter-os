"use server";

import { cookies } from "next/headers";
import { lesTema, TEMA_COOKIE } from "@/lib/tema";

const ETT_AAR_SEKUNDER = 60 * 60 * 24 * 365;

// Ligger på app-nivå (ikke under en rute) fordi TemaKnapp vises på alle
// sider. Ren presentasjonstilstand – derfor ingen auth-sjekk og intet
// ActionResultat. En «sett»-operasjon (ikke toggle) så re-POST uten JS
// (F5 → «send på nytt») og dobbeltklikk er idempotente. Cookie-endring
// i en server action re-rendrer hele ruten (inkl. root-layouten som
// setter data-theme), så byttet slår gjennom i samme rundtur.
export async function settTema(formData: FormData): Promise<void> {
  const tema = lesTema(String(formData.get("tema") ?? ""));
  const cookieStore = await cookies();
  cookieStore.set(TEMA_COOKIE, tema, {
    path: "/",
    maxAge: ETT_AAR_SEKUNDER,
    sameSite: "lax",
  });
}
