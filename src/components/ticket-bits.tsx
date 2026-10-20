import { priorityLabel, ticketStatusLabel } from "@/lib/format";

export const STATUS_STYLES: Record<string, { pill: string; dot: string; bar: string }> = {
  todo: { pill: "bg-paper text-muted border border-line", dot: "bg-[#b9aea3]", bar: "bg-[#d9d0c6]" },
  in_progress: { pill: "bg-[#e5ebf3] text-[#3f5a7d]", dot: "bg-[#5b7ba6]", bar: "bg-[#5b7ba6]" },
  blocked: { pill: "bg-amber-soft text-amber", dot: "bg-amber", bar: "bg-amber" },
  done: { pill: "bg-sage-soft text-sage", dot: "bg-sage", bar: "bg-sage" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.todo;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.pill}`}>
      <i className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {ticketStatusLabel(status)}
    </span>
  );
}

export function PriorityTag({ priority, quiet = false }: { priority: string; quiet?: boolean }) {
  if (quiet && (priority === "medium" || priority === "low")) return null;
  const styles: Record<string, string> = {
    urgent: "text-[#b3261e]",
    high: "text-accent-dark",
    medium: "text-muted",
    low: "text-muted/70",
  };
  const arrows: Record<string, string> = { urgent: "⇈", high: "↑", medium: "=", low: "↓" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${styles[priority] ?? styles.medium}`}>
      <span aria-hidden>{arrows[priority] ?? "="}</span>
      {priorityLabel(priority)}
    </span>
  );
}

/** A stacked bar showing how many tickets are in each status. */
export function ProgressBar({
  counts,
  className = "h-2",
}: {
  counts: Record<string, number>;
  className?: string;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className={`rounded-full bg-paper ${className}`} />;
  return (
    <div className={`flex overflow-hidden rounded-full bg-paper ${className}`}>
      {["done", "in_progress", "blocked", "todo"].map((k) =>
        counts[k] ? (
          <div
            key={k}
            className={STATUS_STYLES[k].bar}
            style={{ width: `${(counts[k] / total) * 100}%` }}
            title={`${counts[k]} ${k.replace("_", " ")}`}
          />
        ) : null
      )}
    </div>
  );
}
