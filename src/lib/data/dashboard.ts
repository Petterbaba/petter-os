import type { DashboardData } from "@/lib/types";
import { getVekt } from "./metrics";
import { getSisteOkt, getVolumtrend } from "./workouts";
import { getKontoer, getPortefolje } from "./investments";
import { getJournal } from "./journal";
import { getVaneData } from "./habits";
import { getMaalData } from "./goals";

// Komponerer dashbordet fra domene-modulene. Hvert domene kan bytte
// datakilde (mock → Supabase) uten at denne filen endres.
export async function getDashboardData(): Promise<DashboardData> {
  const [
    sisteOkt,
    volumtrend,
    kontoer,
    portefolje,
    vekt,
    journal,
    vaneData,
    maalData,
  ] = await Promise.all([
    getSisteOkt(),
    getVolumtrend(),
    getKontoer(),
    getPortefolje(),
    getVekt(),
    getJournal(),
    getVaneData(),
    getMaalData(),
  ]);

  return {
    sisteOkt,
    volumtrend,
    kontoer,
    portefolje,
    vekt,
    journal,
    maal: maalData.maal,
    vaner: vaneData.vaner,
    vaneOppforinger: vaneData.oppforinger,
    vanePeriode: vaneData.periode,
  };
}
