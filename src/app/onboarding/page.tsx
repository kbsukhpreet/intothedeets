import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { createWedding } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("wedding_members")
    .select("wedding_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) redirect("/hq");

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-12">
      <div className="mb-10">
        <Logo />
      </div>
      <h1 className="h-display text-4xl">Let&apos;s set up your wedding</h1>
      <p className="mt-2 text-muted">
        Just the basics for now. You can change any of this later, and invite your partner
        once you&apos;re in.
      </p>

      {error && (
        <p className="mt-6 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">{error}</p>
      )}

      <form action={createWedding} className="card mt-8 space-y-5 p-6">
        <div>
          <label className="label" htmlFor="display_name">Your first name</label>
          <input id="display_name" name="display_name" required className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="partner1_name">Partner one</label>
            <input id="partner1_name" name="partner1_name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="partner2_name">Partner two</label>
            <input id="partner2_name" name="partner2_name" required className="input" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="wedding_date">Wedding date</label>
            <input id="wedding_date" name="wedding_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="total_budget">Total budget</label>
            <input
              id="total_budget"
              name="total_budget"
              inputMode="decimal"
              placeholder="$80,000"
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="location">City or venue (optional)</label>
          <input id="location" name="location" className="input" />
        </div>
        <SubmitButton className="btn-primary w-full" pendingText="Setting things up…">
          Create our wedding HQ
        </SubmitButton>
      </form>
    </main>
  );
}
