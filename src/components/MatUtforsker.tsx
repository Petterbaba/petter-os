"use client";

import { useRef, useState } from "react";
import type { Dinner } from "@/lib/types";
import { MiddagListe } from "./MiddagListe";
import { MiddagSkjema } from "./MiddagSkjema";

// Binder middagskatalogen og dialogen sammen (reise-/mål-mønsteret):
// én native <dialog> huser skjemaet, og ny key per middag remounter
// useState-initialverdiene (ingrediensradene) når man bytter ny/rediger.
export function MatUtforsker({ middager }: { middager: Dinner[] }) {
  const [innhold, setInnhold] = useState<{ rediger?: Dinner } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  function aapne(nyttInnhold: { rediger?: Dinner }) {
    setInnhold(nyttInnhold);
    dialogRef.current?.showModal();
  }

  function lukkDialog() {
    dialogRef.current?.close();
  }

  return (
    <div className="space-y-4">
      {/* Native <dialog> gir fokusfelle, Esc og bakteppe uten avhengig-
          heter. Klikk på bakteppet lukker (target er selve dialog-
          elementet kun når klikket traff utenfor innholdet). */}
      <dialog
        ref={dialogRef}
        onClick={(hendelse) => {
          if (hendelse.target === dialogRef.current) {
            lukkDialog();
          }
        }}
        onClose={() => setInnhold(null)}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-edge bg-card p-0 text-ink backdrop:bg-black/60"
      >
        {innhold !== null && (
          <MiddagSkjema
            key={innhold.rediger?.id ?? "ny"}
            rediger={innhold.rediger}
            onAvbryt={lukkDialog}
            onLagret={lukkDialog}
          />
        )}
      </dialog>

      <MiddagListe
        middager={middager}
        onNy={() => aapne({})}
        onRediger={(middag) => aapne({ rediger: middag })}
      />
    </div>
  );
}
