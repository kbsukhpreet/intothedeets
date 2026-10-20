import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_PURPOSES } from "@/lib/format";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { ViewModeChoice } from "@/components/view-mode-choice";
import { logIn, signUp } from "./actions";

type Search = Promise<{
  mode?: string;
  next?: string;
  error?: string;
  message?: string;
  full_name?: string;
  email?: string;
  purpose?: string;
  view_mode?: string;
}>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const isSignup = params.mode === "signup";
  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/hq";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  const switchHref = `/login?mode=${isSignup ? "login" : "signup"}&next=${encodeURIComponent(next)}`;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <div className={`card w-full p-7 ${isSignup ? "max-w-md" : "max-w-sm"}`}>
        <h1 className="h-display text-3xl">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted">
          {isSignup ? "Get every detail of your event organized in minutes." : "Log in to your event HQ."}
        </p>

        {next.startsWith("/invite/") && !params.error && (
          <p className="mt-5 rounded-lg bg-sage-soft px-3 py-2 text-sm text-sage">
            {isSignup
              ? "You've been invited to a team. Create your account and you'll join right away."
              : "You've been invited to a team. Log in and you'll join right away."}
          </p>
        )}
        {params.error && (
          <p className="mt-5 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">{params.error}</p>
        )}
        {params.message && (
          <p className="mt-5 rounded-lg bg-sage-soft px-3 py-2 text-sm text-sage">{params.message}</p>
        )}

        {isSignup ? (
          <form action={signUp} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            <div>
              <label className="label" htmlFor="full_name">Full name</label>
              <input
                id="full_name"
                name="full_name"
                required
                autoComplete="name"
                defaultValue={params.full_name ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={params.email ?? ""}
                className="input"
              />
            </div>
            <ViewModeChoice
              defaultValue={params.view_mode ?? (next.startsWith("/invite/") ? "team" : undefined)}
            />
            <div>
              <label className="label" htmlFor="purpose">What brings you to Into the Deets?</label>
              <select
                id="purpose"
                name="purpose"
                required
                defaultValue={params.purpose ?? ""}
                className="input"
              >
                <option value="" disabled>Choose one…</option>
                {ACCOUNT_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="input"
                />
              </div>
              <div>
                <label className="label" htmlFor="confirm_password">Confirm password</label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="input"
                />
              </div>
            </div>
            <p className="text-xs text-muted">At least 8 characters.</p>
            <SubmitButton className="btn-primary w-full" pendingText="Creating your account…">
              Create account
            </SubmitButton>
          </form>
        ) : (
          <form action={logIn} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={params.email ?? ""}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
              />
            </div>
            <SubmitButton className="btn-primary w-full" pendingText="Logging in…">
              Log in
            </SubmitButton>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={switchHref} className="btn-link">
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}
