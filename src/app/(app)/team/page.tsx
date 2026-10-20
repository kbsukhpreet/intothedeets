import Link from "next/link";
import { requireEvent, teamPeople } from "@/lib/event";
import { SITE_URL } from "@/lib/env";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { CopyButton } from "@/components/copy-button";
import { ConfirmButton } from "@/components/confirm-button";
import { Avatar } from "@/components/avatar";
import { removeMember, renameTeam, resetInviteLink } from "../actions";

export default async function TeamPage() {
  const { supabase, user, team, teams, events, mode } = await requireEvent();
  const people = await teamPeople(supabase, team.id, user.id);
  const teamEventIds = events.filter((e) => e.team_id === team.id).map((e) => e.id);

  const { data: open } = await supabase
    .from("tasks")
    .select("assignee_id, status")
    .in("event_id", teamEventIds)
    .neq("status", "done");
  const openBy = new Map<string, number>();
  for (const t of open ?? []) if (t.assignee_id) openBy.set(t.assignee_id, (openBy.get(t.assignee_id) ?? 0) + 1);

  const me = people.find((p) => p.id === user.id);
  const isOwner = me?.role === "owner";
  const link = `${SITE_URL || "https://intothedeets.com"}/invite/${team.invite_token}`;

  return (
    <div className="space-y-8">
      <PageHeader
        title={team.name}
        subtitle={`${people.length} ${people.length === 1 ? "person" : "people"} · ${teamEventIds.length} ${teamEventIds.length === 1 ? "event" : "events"}. Everyone here sees every event on this team and can be assigned tickets.`}
      />

      {mode === "personal" && (
        <div className="rounded-2xl bg-amber-soft px-5 py-4 text-sm text-amber">
          You&apos;re in personal view, so tickets and assignments are hidden.{" "}
          <Link href="/settings" className="font-medium underline">Switch to team view</Link> to plan
          together.
        </div>
      )}

      <section className="card p-6">
        <h2 className="h-display text-2xl">Invite people</h2>
        <p className="mt-1 text-sm text-muted">
          Share this link with family, friends or co-planners, for example in your group chat.
          Each person creates their own account and joins {team.name} automatically.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input readOnly value={link} className="input min-w-0 flex-1 font-mono text-xs" />
          <CopyButton value={link} />
        </div>
        {isOwner && (
          <form action={resetInviteLink} className="mt-3">
            <ConfirmButton
              message="Make a new link? The old link will stop working, but people already on the team stay."
              className="text-xs text-muted hover:text-accent"
            >
              Reset link
            </ConfirmButton>
          </form>
        )}
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="h-display text-2xl">Members</h2>
          <Link href="/tickets" className="btn-link">See everyone&apos;s tickets →</Link>
        </div>
        <ul className="mt-4 divide-y divide-line">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-3">
              <Avatar id={p.id} name={p.name} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.name}
                  {p.id === user.id && <span className="text-muted"> (you)</span>}
                </p>
                <p className="truncate text-sm text-muted">{p.email}</p>
              </div>
              <Link
                href={`/tickets?who=${p.id}`}
                className="hidden text-sm text-muted hover:text-accent sm:block"
              >
                {openBy.get(p.id) ?? 0} open
              </Link>
              <span className="w-16 text-right text-xs uppercase tracking-wider text-muted">
                {p.role === "owner" ? "Owner" : "Member"}
              </span>
              {(isOwner || p.id === user.id) && p.id !== team.created_by && (
                <form action={removeMember}>
                  <input type="hidden" name="user_id" value={p.id} />
                  <ConfirmButton
                    message={p.id === user.id ? `Leave ${team.name}?` : `Remove ${p.name} from ${team.name}?`}
                    className="text-xs text-muted hover:text-accent"
                  >
                    {p.id === user.id ? "Leave" : "Remove"}
                  </ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <section className="card p-6">
          <h2 className="h-display text-xl">Team name</h2>
          <form action={renameTeam} className="mt-3 flex gap-2">
            <input name="name" defaultValue={team.name} required className="input" />
            <SubmitButton className="btn-ghost">Save</SubmitButton>
          </form>
        </section>
      )}

      <section className="text-sm text-muted">
        {teams.length > 1 && (
          <p>
            You&apos;re on {teams.length} teams: {teams.map((t) => t.name).join(", ")}. Switch events to
            see another team.
          </p>
        )}
        <p className="mt-1">
          Need a separate team, for a client or another group?{" "}
          <Link href="/events/new?new_team=1" className="btn-link">Start a new team</Link>
        </p>
      </section>
    </div>
  );
}
