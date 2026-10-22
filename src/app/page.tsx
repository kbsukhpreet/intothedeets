import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";

const FEATURES = [
  {
    title: "Event Dashboard",
    body: "Open the app and see what matters today: what's due, who to follow up with, and how many days are left.",
  },
  {
    title: "A home for every vendor",
    body: "Contacts, contract totals, payment schedules and a running log of every call, email and meeting.",
  },
  {
    title: "A budget that knows what's due",
    body: "Contracted, paid and remaining for every vendor, plus exactly what you owe in the next 90 days.",
  },
  {
    title: "Plan together, run many events",
    body: "Invite co-hosts, family or clients to collaborate. Planners can keep every event in one account.",
  },
];

const EVENT_EXAMPLES = ["Weddings", "Birthdays", "Corporate events", "Showers", "Galas", "Reunions"];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/hq");

  return (
    <main className="mx-auto max-w-5xl px-5">
      <header className="flex items-center justify-between py-6">
        <Logo />
        <Link href="/login" className="btn-ghost">
          Log in
        </Link>
      </header>

      <section className="py-16 sm:py-24">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-accent">
          Dream it. Plan it. Deet-ail it.
        </p>
        <h1 className="h-display max-w-3xl text-5xl leading-[1.05] sm:text-7xl">
          Every detail of your event, all in one place.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Stop digging through texts, emails and spreadsheets. Into the Deets keeps your
          vendors, conversations, payments and to-dos together. Planning with others? Assign
          tickets to your team and track everyone&apos;s progress, so you always know what&apos;s
          done and what&apos;s next.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/login?mode=signup" className="btn-primary px-6 py-3 text-base">
            Start planning — it&apos;s free
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap gap-2">
          {EVENT_EXAMPLES.map((e) => (
            <span key={e} className="rounded-full border border-line bg-white px-3 py-1 text-sm text-muted">
              {e}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 pb-24 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6">
            <h2 className="h-display text-xl">{f.title}</h2>
            <p className="mt-2 text-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-line py-8 text-sm text-muted">
        © {new Date().getFullYear()} Into the Deets
      </footer>
    </main>
  );
}
