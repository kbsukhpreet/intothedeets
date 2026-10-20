import { requireEvent } from "@/lib/event";
import Link from "next/link";
import { EVENT_TYPES } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { deleteEvent, updateEvent } from "../actions";

export default async function SettingsPage() {
  const { event, user, team } = await requireEvent();

  const isCreator = event.created_by === user.id;

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="This event's details." />

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

      <section className="card flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h2 className="h-display text-2xl">Who&apos;s planning</h2>
          <p className="mt-1 text-sm text-muted">
            Everyone on <strong>{team.name}</strong> can see and work on this event.
          </p>
        </div>
        <Link href="/team" className="btn-ghost">Manage team &amp; invites</Link>
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
