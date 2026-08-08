import type { Note } from "@/lib/types";
import { notater } from "@/lib/mock/notes";

// Mock til notat-domenet migreres (fase 4).
export async function getNotater(): Promise<Note[]> {
  return notater;
}
