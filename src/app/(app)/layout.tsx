import { requireWedding } from "@/lib/wedding";
import { daysUntil } from "@/lib/format";
import { Logo } from "@/components/logo";
import { BottomNav, SideNav } from "@/components/nav";
import { logOut } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { wedding } = await requireWedding();
  const days = wedding.wedding_date ? daysUntil(wedding.wedding_date) : null;

  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
        <div className="px-2">
          <Logo href="/hq" />
        </div>
        <div className="mt-8 px-3">
          <p className="h-display text-lg leading-tight">
            {wedding.partner1_name} &amp; {wedding.partner2_name}
          </p>
          {days !== null && days >= 0 && (
            <p className="mt-0.5 text-sm text-muted">
              {days === 0 ? "It's today!" : `${days} days to go`}
            </p>
          )}
        </div>
        <div className="mt-6 flex-1">
          <SideNav />
        </div>
        <form action={logOut}>
          <button className="px-3 text-sm text-muted hover:text-ink">Log out</button>
        </form>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-line px-5 py-4 md:hidden">
          <Logo href="/hq" />
          <span className="text-sm text-muted">
            {wedding.partner1_name} &amp; {wedding.partner2_name}
          </span>
        </header>
        <main className="mx-auto max-w-5xl px-5 pb-28 pt-6 md:px-10 md:pb-16 md:pt-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
