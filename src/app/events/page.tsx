import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { daysUntil, prettyDate } from "@/lib/format";
import { Logo } from "@/components/logo";
import { switchEvent } from "@/app/(app)/actions";
import { logOut } from "@/app/login/actions";

export default async function EventsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data }, { data: teamRows }] = await Promise.all([
    supabase
      .from("events")
      .select("id, team_id, name, event_type, event_date, location")
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase.from("teams").select("id, name").order("created_at"),
  ]);
  const events = data ?? [];
  if (events.length === 0) redirect("/events/new");
  const teams = (teamRows ?? []).filter((t) => events.some((e) => e.team_id === t.id));

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-10 flex items-center justify-between">
        <Logo href="/hq" />
        <form action={logOut}>
          <button className="text-sm text-muted hover:text-ink">Log out</button>
        </form>
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="h-display text-4xl">Your events</h1>
        <Link href="/events/new" className="btn-primary">+ New event</Link>
      </div>
      {teams.map((team) => (
      <section key={team.id} className="mb-10">
      {teams.length > 1 && (
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">{team.name}</h2>
      )}
      <ul className="space-y-3">
        {events.filter((e) => e.team_id === team.id).map((e) => {
          const days = e.event_date ? daysUntil(e.event_date) : null;
          return (
            <li key={e.id}>
              <form action={switchEvent}>
                <input type="hidden" name="event_id" value={e.id} />
                <button className="card flex w-full items-center gap-4 p-5 text-left transition hover:border-accent/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-accent">{e.event_type}</p>
                    <p className="h-display mt-0.5 truncate text-xl">{e.name}</p>
                    <p className="text-sm text-muted">
                      {e.event_date ? prettyDate(e.event_date, true) : "No date yet"}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  {days !== null && days >= 0 && (
                    <div className="text-right">
                      <p className="h-display text-3xl tabular-nums">{days}</p>
                      <p className="text-xs text-muted">days to go</p>
                    </div>
                  )}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
      </section>
      ))}
      <p className="text-sm text-muted">
        <Link href="/events/new?new_team=1" className="btn-link">Start a new team</Link> for a separate
        group, like a client.
      </p>
    </main>
  );
}
