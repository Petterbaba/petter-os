import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { opprettServerKlient } from "@/lib/supabase/server";
import { LoggInnSkjema } from "@/components/LoggInnSkjema";

export const metadata: Metadata = {
  title: "Logg inn · petter-os",
};

export default async function LoggInn() {
  // Allerede innlogget? Rett hjem.
  const supabase = await opprettServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-4 py-16">
      <p className="text-xs font-medium uppercase tracking-widest text-ink-3">
        petter<span className="text-accent">-os</span>
      </p>
      <LoggInnSkjema />
    </main>
  );
}
