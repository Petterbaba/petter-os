import type { Metadata } from "next";
import { opprettServerKlient } from "@/lib/supabase/server";
import { SideHeader } from "@/components/SideHeader";
import { PassordSkjema } from "@/components/PassordSkjema";

export const metadata: Metadata = {
  title: "Innstillinger · petter-os",
};

export default async function Innstillinger() {
  const supabase = await opprettServerKlient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <SideHeader />
      <p className="mb-4 text-sm text-ink-3">
        Innlogget som <span className="text-ink-2">{user?.email}</span>
      </p>
      <PassordSkjema />
    </main>
  );
}
