import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_EVENT_COOKIE } from "@/lib/event";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";

async function join(form: FormData) {
  "use server";
  const token = String(form.get("token") ?? "");
  const supabase = await createClient();
  const { data: teamId, error } = await supabase.rpc("join_team", { p_token: token });
  if (error) redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);

  // Joining a team means they'll want the team view.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ view_mode: "team" }).eq("id", user.id);

  // Open one of the team's events, or let them create the first one.
  const { data: firstEvent } = await supabase
    .from("events")
    .select("id")
    .eq("team_id", teamId)
    .order("event_date", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!firstEvent) redirect(`/events/new?team=${teamId}`);

  (await cookies()).set(CURRENT_EVENT_COOKIE, firstEvent.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/tickets?who=me");
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase.rpc("team_invite_preview", { p_token: token });
  const invite = Array.isArray(data) ? data[0] : null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="card w-full max-w-sm p-7 text-center">
        {!invite ? (
          <>
            <h1 className="h-display text-3xl">Link not found</h1>
            <p className="mt-2 text-sm text-muted">
              This invite link isn&apos;t valid anymore. Ask whoever sent it for the current link
              from their Team page.
            </p>
          </>
        ) : invite.already_member ? (
          <>
            <h1 className="h-display text-3xl">You&apos;re already on {invite.team_name}</h1>
            <a href="/hq" className="btn-primary mt-6 w-full">Go to my HQ</a>
          </>
        ) : (
          <>
            <p className="text-sm uppercase tracking-[0.2em] text-accent">You&apos;re invited</p>
            <h1 className="h-display mt-3 text-3xl">Join {invite.team_name}</h1>
            <p className="mt-2 text-sm text-muted">
              {invite.inviter_name ? `${invite.inviter_name} invited you` : "You've been invited"} to plan
              together on Into the Deets. {Number(invite.member_count)}{" "}
              {Number(invite.member_count) === 1 ? "person is" : "people are"} on the team.
            </p>
            {error && (
              <p className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">{error}</p>
            )}
            <form action={join} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <SubmitButton className="btn-primary w-full" pendingText="Joining…">
                Join the team
              </SubmitButton>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
