import { requireEvent } from "@/lib/event";
import Link from "next/link";
import { EVENT_TYPES } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { DatePicker } from "@/components/date-picker";
import { VIEW_MODES, ModeIcon } from "@/components/view-mode-choice";
import { deleteEvent, setNotifications, setViewMode, updateEvent, updateProfile } from "../actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ switched?: string; error?: string; saved?: string }>;
}) {
  const { switched, error, saved } = await searchParams;
  const { supabase, event, user, team, mode } = await requireEvent();
  const { data: prefs } = await supabase
    .from("profiles")
    .select("full_name, email, notify_assigned, notify_comments")
    .eq("id", user.id)
    .maybeSingle();

  const isCreator = event.created_by === user.id;

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" />

      {error && (
        <div className="rounded-2xl bg-accent-soft px-5 py-4 text-sm text-accent-dark">{error}</div>
      )}

      {switched && !error && (
        <div className="rounded-2xl bg-sage-soft px-5 py-4 text-sm text-sage">
          {switched === "team" ? (
            <>
              <strong>You&apos;re now in team view.</strong> Your tasks are now tickets you can assign.{" "}
              <Link href="/team" className="underline">Invite your team</Link> to get started.
            </>
          ) : (
            <>
              <strong>You&apos;re now in personal view.</strong> Everything you had is still here, just
              simpler. Anyone on your team keeps access to shared events.
            </>
          )}
        </div>
      )}

      <section id="profile" className="card scroll-mt-6 p-6">
        <h2 className="h-display text-2xl">Your profile</h2>
        <p className="mt-1 text-sm text-muted">Your name shows on your dashboard, tickets and comments.</p>
        {saved === "profile" && (
          <p className="mt-3 rounded-lg bg-sage-soft px-3 py-2 text-sm text-sage">Saved.</p>
        )}
        <form action={updateProfile} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="label" htmlFor="full_name">Full name</label>
            <input
              id="full_name"
              name="full_name"
              required
              autoComplete="name"
              defaultValue={prefs?.full_name ?? ""}
              placeholder="e.g. Sukhpreet Kaur"
              className="input"
            />
          </div>
          <SubmitButton className="btn-primary">Save name</SubmitButton>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="h-display text-2xl">How you plan</h2>
        <p className="mt-1 text-sm text-muted">
          Switch anytime. Nothing is deleted. Your tasks, vendors and budget stay exactly the same.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {VIEW_MODES.map((m) => {
            const current = m.value === mode;
            return (
              <form key={m.value} action={setViewMode}>
                <input type="hidden" name="view_mode" value={m.value} />
                <button
                  disabled={current}
                  className={`relative flex h-full w-full flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition ${
                    current
                      ? "cursor-default border-accent bg-accent-soft/50"
                      : "border-line bg-white hover:border-accent/50"
                  }`}
                >
                  <span className="text-accent"><ModeIcon mode={m.value} /></span>
                  <span className="font-medium">{m.title}</span>
                  <span className="text-xs leading-relaxed text-muted">{m.body}</span>
                  <span
                    className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${
                      current ? "bg-accent text-white" : "border border-line bg-white text-accent"
                    }`}
                  >
                    {current ? "✓ Current view" : `Switch to ${m.value === "team" ? "team" : "personal"} view`}
                  </span>
                </button>
              </form>
            );
          })}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="h-display text-2xl">Event details</h2>
        <p className="mt-1 text-sm text-muted">For {event.name}.</p>
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
            <DatePicker id="date" name="event_date" defaultValue={event.event_date} placeholder="Choose a date" />
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

      {mode === "team" && (
        <section className="card p-6">
          <h2 className="h-display text-2xl">Email notifications</h2>
          <p className="mt-1 text-sm text-muted">
            Sent to {prefs?.email ?? user.email}. You never get emails about things you did yourself.
          </p>
          {saved === "notifications" && (
            <p className="mt-3 rounded-lg bg-sage-soft px-3 py-2 text-sm text-sage">Saved.</p>
          )}
          <form action={setNotifications} className="mt-4 space-y-3">
            <Toggle
              name="notify_assigned"
              defaultChecked={prefs?.notify_assigned ?? true}
              title="When I'm assigned a ticket"
              body="Get an email with the ticket and a link to open it."
            />
            <SubmitButton className="btn-ghost">Save notification settings</SubmitButton>
          </form>
        </section>
      )}

      {mode === "team" && (
      <section className="card flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h2 className="h-display text-2xl">Invite your team</h2>
          <p className="mt-1 text-sm text-muted">
            Everyone on <strong>{team.name}</strong> can see and work on this event.
          </p>
        </div>
        <Link href="/team" className="btn-ghost">Manage team &amp; invites</Link>
      </section>
      )}

      {isCreator && (
        <details className="card group border-[#f1c9c4] p-6">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-[#e7a59d] bg-[#fdf1ef] px-4 py-2 text-sm font-medium text-[#b3261e] transition hover:bg-[#fbe3df] group-open:hidden">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Delete this event
          </summary>
          <h2 className="hidden font-display text-xl text-[#b3261e] group-open:block">Delete this event</h2>
          <form action={deleteEvent} className="mt-4 space-y-3">
            <p className="text-sm">
              This permanently deletes <strong>{event.name}</strong> with all of its vendors,
              conversations, payments and tasks, for everyone. Type the event name to confirm.
            </p>
            <input name="confirm_name" required placeholder={event.name} className="input" />
            <SubmitButton
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#b3261e] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#931f18] disabled:opacity-50"
              pendingText="Deleting…"
            >
              Delete event forever
            </SubmitButton>
          </form>
        </details>
      )}
    </div>
  );
}

function Toggle({
  name,
  defaultChecked,
  title,
  body,
}: {
  name: string;
  defaultChecked: boolean;
  title: string;
  body: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 hover:bg-paper">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-line transition peer-checked:bg-accent after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted">{body}</span>
      </span>
    </label>
  );
}
