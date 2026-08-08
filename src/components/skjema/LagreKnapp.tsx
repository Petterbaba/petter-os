"use client";

import { useFormStatus } from "react-dom";

// Send-knapp med pending-state; må stå inne i <form>-en den hører til.
export function LagreKnapp({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-edge px-4 py-2 text-sm text-ink transition-colors hover:border-accent disabled:opacity-50"
    >
      {pending ? "Lagrer …" : children}
    </button>
  );
}
