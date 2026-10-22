import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { RotatingWord } from "@/components/rotating-word";

/*
 * Type scale used on this page (largest to smallest):
 *   Hero headline   text-5xl → 7xl   (display font)
 *   Section heading text-3xl → 4xl   (display font)
 *   Rotating line   text-2xl → 3xl   (display font)
 *   Feature titles  text-xl          (display font)
 *   Lead paragraph  text-lg → xl
 *   Body text       text-base
 *   Eyebrow labels  text-xs → sm, spaced capitals
 */

const FEATURES = [
  {
    title: "Your Event Dashboard",
    body: "Open it up and see what matters today: what's due, who to follow up with, and how many days are left.",
    icon: (
      <>
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
      </>
    ),
  },
  {
    title: "Tickets for your team",
    body: "Assign to-dos to family, friends or co-planners, see everyone's progress at a glance, and keep the chatter in comments.",
    icon: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1.5" />
        <rect x="10" y="4" width="5" height="10" rx="1.5" />
        <rect x="17" y="4" width="4" height="13" rx="1.5" />
      </>
    ),
  },
  {
    title: "A home for every vendor",
    body: "Contacts, contracts, payment schedules and a running log of every call, so you can always find what the florist said.",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5" />
        <circle cx="17.5" cy="9" r="2.5" />
        <path d="M17 14.5c2.4.2 4 1.8 4.5 4.5" />
      </>
    ),
  },
  {
    title: "A budget that knows what's due",
    body: "Contracted, paid and remaining for every vendor, plus exactly what you owe in the next 90 days. No surprises.",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
  },
];

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

      {/* Hero */}
      <section className="pb-20 pt-14 sm:pb-28 sm:pt-24">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent sm:text-sm">
          Dream it. Plan it. Deet-ail it.
        </p>
        <h1 className="h-display mt-5 max-w-3xl text-balance text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
          Every detail of your event, all in one place.
        </h1>
        <p className="mt-7 max-w-2xl text-pretty text-lg leading-relaxed text-muted sm:text-xl sm:leading-relaxed">
          Stop digging through texts, emails and spreadsheets. Into the Deets keeps your
          vendors, conversations, payments and to-dos together. Planning with others? Assign
          tickets to your team and track everyone&apos;s progress, so you always know what&apos;s
          done and what&apos;s next.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/login?mode=signup" className="btn-primary px-6 py-3 text-base">
            Start planning — it&apos;s free
          </Link>
          <Link href="/login" className="text-sm text-muted hover:text-ink">
            Already have an account? <span className="font-medium text-accent">Log in</span>
          </Link>
        </div>
        <p className="h-display mt-16 text-2xl text-ink/80 sm:text-3xl">
          Made for your next <RotatingWord />
        </p>
      </section>

      {/* Features */}
      <section className="border-t border-line py-20 sm:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent sm:text-sm">
          What&apos;s inside
        </p>
        <h2 className="h-display mt-4 max-w-2xl text-balance text-3xl leading-tight sm:text-4xl">
          Everything you&apos;d otherwise keep in five different apps.
        </h2>

        <div className="mt-14 grid gap-x-14 gap-y-12 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-5">
              <div className="shrink-0">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {f.icon}
                  </svg>
                </span>
              </div>
              <div>
                <h3 className="h-display text-xl leading-snug">{f.title}</h3>
                <p className="mt-2 text-pretty text-base leading-relaxed text-muted">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="relative mb-20 overflow-hidden rounded-3xl bg-accent px-7 py-14 text-white sm:px-12 sm:py-16">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border-[20px] border-white/10" />
        <div className="absolute -right-28 top-10 h-56 w-56 rounded-full border-[20px] border-white/10" />
        <h2 className="h-display relative max-w-xl text-balance text-3xl leading-tight sm:text-4xl">
          Ready to get into the deets?
        </h2>
        <p className="relative mt-3 max-w-lg text-pretty text-base leading-relaxed text-white/85 sm:text-lg">
          Set up your first event in under a minute. Free to start, and you can invite your team
          whenever you&apos;re ready.
        </p>
        <Link
          href="/login?mode=signup"
          className="relative mt-8 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-medium text-accent-dark transition hover:bg-paper"
        >
          Start planning →
        </Link>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-8 text-sm text-muted">
        <span>© {new Date().getFullYear()} Into the Deets</span>
        <span className="font-display italic">Dream it. Plan it. Deet-ail it.</span>
      </footer>
    </main>
  );
}
