import type { VaneData } from "@/lib/types";
import { genererVaneData } from "@/lib/mock/habits";

// Mock til vane-domenet migreres (fase 2).
export async function getVaneData(): Promise<VaneData> {
  return genererVaneData();
}
