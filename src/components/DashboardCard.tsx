type DashboardCardProps = {
  tittel: string;
  hovedtall?: string;
  undertekst?: string;
  children: React.ReactNode;
};

export function DashboardCard({
  tittel,
  hovedtall,
  undertekst,
  children,
}: DashboardCardProps) {
  return (
    <section className="min-w-0 rounded-xl border border-edge bg-card p-4 sm:p-5">
      <header className="mb-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-ink-3">
          {tittel}
        </h2>
        {hovedtall && (
          <p className="mt-1.5 text-2xl font-semibold text-ink sm:text-3xl">
            {hovedtall}
          </p>
        )}
        {undertekst && <p className="mt-0.5 text-sm text-ink-2">{undertekst}</p>}
      </header>
      {children}
    </section>
  );
}
