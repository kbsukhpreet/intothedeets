import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_EVENT_COOKIE } from "@/lib/event";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";

async function accept(form: FormData) {
  "use server";
  const token = String(form.get("token") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`);
  (await cookies()).set(CURRENT_EVENT_COOKIE, String(data), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/hq");
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

  const { data } = await supabase.rpc("invite_preview", { p_token: token });
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
              This invite link isn&apos;t valid. Ask whoever sent it to create a new one from Settings.
            </p>
          </>
        ) : invite.used ? (
          <>
            <h1 className="h-display text-3xl">Already used</h1>
            <p className="mt-2 text-sm text-muted">
              This link has already been used. Ask whoever sent it for a fresh one.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm uppercase tracking-[0.2em] text-accent">You&apos;re invited to help plan</p>
            <h1 className="h-display mt-3 text-3xl">{invite.event_name}</h1>
            <p className="mt-1 text-sm text-muted">{invite.event_type}</p>
            {error && (
              <p className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-dark">{error}</p>
            )}
            <form action={accept} className="mt-6">
              <input type="hidden" name="token" value={token} />
              <SubmitButton className="btn-primary w-full" pendingText="Joining…">
                Join this event
              </SubmitButton>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
