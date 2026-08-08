import type { DashboardData } from "@/lib/types";
import { getVekt } from "./metrics";
import { getSisteOkt, getVolumtrend } from "./workouts";
import { getKontoer, getPortefolje } from "./investments";
import { getNotater } from "./notes";
import { getVaneData } from "./habits";

// Komponerer dashbordet fra domene-modulene. Hvert domene kan bytte
// datakilde (mock → Supabase) uten at denne filen endres.
export async function getDashboardData(): Promise<DashboardData> {
  const [sisteOkt, volumtrend, kontoer, portefolje, vekt, notater, vaneData] =
    await Promise.all([
      getSisteOkt(),
      getVolumtrend(),
      getKontoer(),
      getPortefolje(),
      getVekt(),
      getNotater(),
      getVaneData(),
    ]);

  return {
    sisteOkt,
    volumtrend,
    kontoer,
    portefolje,
    vekt,
    notater,
    vaner: vaneData.vaner,
    vaneOppforinger: vaneData.oppforinger,
    vanePeriode: vaneData.periode,
  };
}
