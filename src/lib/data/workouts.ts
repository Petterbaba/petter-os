import type { WeeklyVolume, Workout } from "@/lib/types";
import { sisteOkt, volumtrend } from "@/lib/mock/workouts";

// Mock til trenings-domenet migreres (fase 3).
export async function getSisteOkt(): Promise<Workout> {
  return sisteOkt;
}

export async function getVolumtrend(): Promise<WeeklyVolume[]> {
  return volumtrend;
}
