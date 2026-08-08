import type { Account, PortfolioPoint } from "@/lib/types";
import { kontoer, portefolje } from "@/lib/mock/investments";

// Mock til investerings-domenet migreres (fase 5 – transaksjonsmodell).
export async function getKontoer(): Promise<Account[]> {
  return kontoer;
}

export async function getPortefolje(): Promise<PortfolioPoint[]> {
  return portefolje;
}
