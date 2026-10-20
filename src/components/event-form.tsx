import { EVENT_TYPES } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

export function EventForm({
  action,
  submitLabel,
  teams,
  defaultTeamId,
  suggestedTeamName,
  forceNewTeam,
}: {
  action: (form: FormData) => Promise<void>;
  submitLabel: string;
  teams: { id: string; name: string }[];
  defaultTeamId?: string;
  suggestedTeamName: string;
  forceNewTeam?: boolean;
}) {
  const needsTeam = forceNewTeam || teams.length === 0;

  return (
    <form action={action} className="card space-y-5 p-6">
      {needsTeam ? (
        <div className="rounded-xl bg-paper p-4">
          <input type="hidden" name="team_id" value="new" />
          <label className="label" htmlFor="team_name">Team name</label>
          <input id="team_name" name="team_name" required defaultValue={suggestedTeamName} className="input" />
          <p className="mt-1.5 text-xs text-muted">
            Your team is everyone helping plan, like your family or co-planners. You&apos;ll get a link to
            invite them next.
          </p>
        </div>
      ) : teams.length > 1 ? (
        <div>
          <label className="label" htmlFor="team_id">Team</label>
          <select id="team_id" name="team_id" defaultValue={defaultTeamId ?? teams[0].id} className="input">
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="team_id" value={teams[0].id} />
      )}

      <div>
        <label className="label" htmlFor="name">Event name</label>
        <input
          id="name"
          name="name"
          required
          placeholder="e.g. Alex & Sam's Wedding, Mom's 60th, Summer Team Offsite"
          className="input"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="event_type">Type of event</label>
          <select id="event_type" name="event_type" defaultValue="" required className="input">
            <option value="" disabled>Choose one…</option>
            {EVENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="event_date">Date (if you know it)</label>
          <input id="event_date" name="event_date" type="date" className="input" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="total_budget">Total budget</label>
          <input id="total_budget" name="total_budget" inputMode="decimal" placeholder="$25,000" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="location">City or venue</label>
          <input id="location" name="location" className="input" />
        </div>
      </div>
      <SubmitButton className="btn-primary w-full" pendingText="Setting things up…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
