import Link from "next/link";
import type { ReactNode } from "react";

// «← Kokebok»-lenken øverst på undersider i kokeboken. Appen har bevisst
// ingen navbar (SideHeader-kommentaren) – dypere sider trenger derfor en
// egen vei tilbake ett nivå.
export function TilbakeLenke({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <p className="mb-4">
      <Link
        href={href}
        className="text-xs text-ink-3 transition-colors hover:text-ink"
      >
        ← {children}
      </Link>
    </p>
  );
}
