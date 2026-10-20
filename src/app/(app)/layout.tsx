import Link from "next/link";
import { requireEvent } from "@/lib/event";
import { daysUntil } from "@/lib/format";
import { Logo } from "@/components/logo";
import { BottomNav, SideNav } from "@/components/nav";
import { EventSwitcher } from "@/components/event-switcher";
import { logOut } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { event, events, team } = await requireEvent();
  const days = event.event_date ? daysUntil(event.event_date) : null;
  const switcherEvents = events.map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
        <div className="px-2">
          <Logo href="/hq" />
        </div>
        <div className="mt-8 px-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-accent">{team.name} · {event.event_type}</p>
          <p className="h-display mt-0.5 text-lg leading-tight">{event.name}</p>
          {days !== null && days >= 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {days === 0 ? "It's today!" : `${days} day${days === 1 ? "" : "s"} to go`}
            </p>
          )}
          <div className="mt-3">
            <EventSwitcher events={switcherEvents} currentId={event.id} />
          </div>
        </div>
        <div className="mt-6 flex-1">
          <SideNav />
        </div>
        <form action={logOut}>
          <button className="px-3 text-sm text-muted hover:text-ink">Log out</button>
        </form>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="border-b border-line px-5 py-4 md:hidden">
          <div className="flex items-center justify-between">
            <Logo href="/hq" />
            <div className="flex items-center gap-4 text-sm text-muted">
              <Link href="/settings">Settings</Link>
              <form action={logOut}>
                <button>Log out</button>
              </form>
            </div>
          </div>
          <div className="mt-3">
            <p className="h-display text-lg leading-tight">{event.name}</p>
            <div className="mt-2">
              <EventSwitcher events={switcherEvents} currentId={event.id} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 pb-28 pt-6 md:px-10 md:pb-16 md:pt-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
