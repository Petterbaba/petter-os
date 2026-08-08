import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

// Server-side Supabase-klient (server components + server actions).
// Appen har ingen browser-klient – all datatilgang går gjennom denne.
export async function opprettServerKlient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesTilSetting) {
          try {
            cookiesTilSetting.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Kalt fra en server component, som ikke kan sette cookies.
            // Trygt å ignorere: proxyen (src/proxy.ts) fornyer sesjonen.
          }
        },
      },
    },
  );
}
