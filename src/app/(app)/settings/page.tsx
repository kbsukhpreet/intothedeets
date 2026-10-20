import { requireWedding } from "@/lib/wedding";
import { SITE_URL } from "@/lib/env";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { CopyButton } from "@/components/copy-button";
import { createInvite, revokeInvite, updateWedding } from "../actions";

export default async function SettingsPage() {
  const { supabase, wedding, user } = await requireWedding();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("wedding_members").select("user_id, role, display_name, email").order("joined_at"),
    supabase
      .from("wedding_invites")
      .select("id, token, created_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const site = SITE_URL || "https://intothedeets.com";

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Your wedding details and who's planning with you." />

      <section className="card p-6">
        <h2 className="h-display text-2xl">Wedding details</h2>
        <form action={updateWedding} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p1">Partner one</label>
            <input id="p1" name="partner1_name" defaultValue={wedding.partner1_name} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="p2">Partner two</label>
            <input id="p2" name="partner2_name" defaultValue={wedding.partner2_name} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="date">Wedding date</label>
            <input id="date" name="wedding_date" type="date" defaultValue={wedding.wedding_date ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="budget">Total budget</label>
            <input
              id="budget"
              name="total_budget"
              inputMode="decimal"
              defaultValue={Number(wedding.total_budget) || ""}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="loc">City or venue</label>
            <input id="loc" name="location" defaultValue={wedding.location ?? ""} className="input" />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Save details</SubmitButton>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="h-display text-2xl">Planning together</h2>
        <p className="mt-1 text-sm text-muted">
          Everyone here sees and edits the same vendors, budget and tasks.
        </p>

        <ul className="mt-5 divide-y divide-line">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">
                  {m.display_name ?? m.email}
                  {m.user_id === user.id && <span className="text-muted"> (you)</span>}
                </p>
                <p className="text-sm text-muted">{m.email}</p>
              </div>
              <span className="text-xs uppercase tracking-wider text-muted">
                {m.role === "owner" ? "Creator" : m.role}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-xl bg-paper p-4">
          <p className="font-medium">Invite your partner</p>
          <p className="mt-1 text-sm text-muted">
            Create a private link and text or email it to them. They&apos;ll make an account and
            join this wedding. Each link works once.
          </p>

          {(invites ?? []).map((inv) => {
            const link = `${site}/invite/${inv.token}`;
            return (
              <div key={inv.id} className="mt-4 flex flex-wrap items-center gap-2">
                <input readOnly value={link} className="input min-w-0 flex-1 font-mono text-xs" />
                <CopyButton value={link} />
                <form action={revokeInvite}>
                  <input type="hidden" name="id" value={inv.id} />
                  <button className="text-sm text-muted hover:text-accent">Cancel</button>
                </form>
              </div>
            );
          })}

          {(invites ?? []).length === 0 && (
            <form action={createInvite} className="mt-4">
              <SubmitButton className="btn-primary" pendingText="Creating…">
                Create invite link
              </SubmitButton>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
