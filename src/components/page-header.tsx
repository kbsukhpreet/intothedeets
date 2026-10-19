export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="h-display text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    booked: "bg-sage-soft text-sage",
    contacted: "bg-amber-soft text-amber",
    researching: "bg-paper text-muted border border-line",
    declined: "bg-paper text-muted/70 line-through",
  };
  const labels: Record<string, string> = {
    booked: "Booked",
    contacted: "In talks",
    researching: "Researching",
    declined: "Passed",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.researching}`}>
      {labels[status] ?? status}
    </span>
  );
}
