import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { logIn, signUp } from "./actions";

type Search = Promise<{ mode?: string; next?: string; error?: string; message?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const isSignup = params.mode === "signup";
  const next = params.next && params.next.startsWith("/") ? params.next : "/hq";

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
      <div className="card w-full max-w-sm p-7">
        <h1 className="h-display text-3xl">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-muted">
          {isSignup ? "Start organizing your wedding in minutes." : "Log in to your wedding HQ."}
        </p>

        {params.error && (
          <p className="mt-5 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">
            {params.error}
          </p>
        )}
        {params.message && (
          <p className="mt-5 rounded-lg bg-sage-soft px-3 py-2 text-sm text-sage">{params.message}</p>
        )}

        <form action={isSignup ? signUp : logIn} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="input"
            />
          </div>
          <SubmitButton className="btn-primary w-full">
            {isSignup ? "Create account" : "Log in"}
          </SubmitButton>
        </form>

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
