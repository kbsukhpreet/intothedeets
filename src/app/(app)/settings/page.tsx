import { requireEvent } from "@/lib/event";
import { SITE_URL } from "@/lib/env";
import { EVENT_TYPES } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { CopyButton } from "@/components/copy-button";
import { createInvite, deleteEvent, revokeInvite, updateEvent } from "../actions";

export default async function SettingsPage() {
  const { supabase, event, user } = await requireEvent();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("event_members")
      .select("user_id, role, display_name, email")
      .eq("event_id", event.id)
      .order("joined_at"),
    supabase
      .from("event_invites")
      .select("id, token, created_at")
      .eq("event_id", event.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const site = SITE_URL || "https://intothedeets.com";
  const isCreator = event.created_by === user.id;

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="This event's details and who's planning it with you." />

      <section className="card p-6">
        <h2 className="h-display text-2xl">Event details</h2>
        <form action={updateEvent} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Event name</label>
            <input id="name" name="name" defaultValue={event.name} required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="type">Type of event</label>
            <select id="type" name="event_type" defaultValue={event.event_type} className="input">
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="date">Event date</label>
            <input id="date" name="event_date" type="date" defaultValue={event.event_date ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="budget">Total budget</label>
            <input
              id="budget"
              name="total_budget"
              inputMode="decimal"
              defaultValue={Number(event.total_budget) || ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="loc">City or venue</label>
            <input id="loc" name="location" defaultValue={event.location ?? ""} className="input" />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Save details</SubmitButton>
          </div>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="h-display text-2xl">Planning together</h2>
        <p className="mt-1 text-sm text-muted">
          Everyone here sees and edits this event&apos;s vendors, budget and tasks.
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
                {m.role === "owner" ? "Creator" : "Collaborator"}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-xl bg-paper p-4">
          <p className="font-medium">Invite someone to help plan</p>
          <p className="mt-1 text-sm text-muted">
            A partner, family member, co-host or planner. Create a private link and text or
            email it to them. They&apos;ll make an account and join this event. Each link works once.
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

      {isCreator && (
        <details className="card group p-6">
          <summary className="cursor-pointer list-none text-sm text-muted hover:text-ink">
            Delete this event…
          </summary>
          <form action={deleteEvent} className="mt-4 space-y-3">
            <p className="text-sm">
              This permanently deletes <strong>{event.name}</strong> with all of its vendors,
              conversations, payments and tasks, for everyone. Type the event name to confirm.
            </p>
            <input name="confirm_name" required placeholder={event.name} className="input" />
            <SubmitButton className="btn-ghost text-accent-dark" pendingText="Deleting…">
              Delete event forever
            </SubmitButton>
          </form>
        </details>
      )}
    </div>
  );
}
