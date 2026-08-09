import type { JournalEntry } from "@/lib/types";
import { journal } from "@/lib/mock/journal";

// Mock til journal-domenet migreres (migrasjonen ligger klar i
// supabase/migrations/, men er ikke applisert ennå).
export async function getJournal(): Promise<JournalEntry[]> {
  return journal;
}
