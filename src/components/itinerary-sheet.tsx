import { formatTime, longDate } from "@/lib/format";

export type SheetItem = {
  start_time: string | null;
  end_time: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  who: string | null;
};
export type SheetDay = { id: string; title: string; day_date: string | null; items: SheetItem[] };

/** A clean, read-only itinerary used for printing and the shared link. */
export function ItinerarySheet({
  eyebrow,
  title,
  subtitle,
  days,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  days: SheetDay[];
}) {
  return (
    <div>
      <header className="border-b border-line pb-6">
        {eyebrow && <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">{eyebrow}</p>}
        <h1 className="h-display mt-2 text-4xl leading-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      </header>

      {days.length === 0 && <p className="py-10 text-center text-muted">The itinerary hasn&apos;t been filled in yet.</p>}

      {days.map((d) => (
        <section key={d.id} className="break-inside-avoid-page py-8 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-line">
          <h2 className="h-display text-2xl">{d.title}</h2>
          {d.day_date && <p className="text-sm text-muted">{longDate(d.day_date)}</p>}

          {d.items.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing scheduled yet.</p>
          ) : (
            <ol className="mt-5 space-y-1">
              {d.items.map((i, n) => (
                <li key={n} className="grid break-inside-avoid grid-cols-[6.5rem_1fr] gap-4 rounded-xl px-3 py-2.5 odd:bg-paper print:odd:bg-transparent">
                  <div className="text-sm tabular-nums">
                    <span className="font-semibold">{i.start_time ? formatTime(i.start_time) : "Anytime"}</span>
                    {i.end_time && <span className="block text-xs text-muted">to {formatTime(i.end_time)}</span>}
                  </div>
                  <div>
                    <p className="font-medium">
                      {i.title}
                      {i.who && <span className="ml-2 text-sm font-normal text-accent">· {i.who}</span>}
                    </p>
                    {i.location && <p className="text-sm text-muted">📍 {i.location}</p>}
                    {i.notes && <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted">{i.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
