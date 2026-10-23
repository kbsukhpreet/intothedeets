import Link from "next/link";
import { requireEvent, teamPeople, type Person } from "@/lib/event";
import { TICKET_PRIORITIES, TICKET_STATUSES, prettyDate, relativeDue, todayISO } from "@/lib/format";
import { Empty } from "@/components/page-header";
import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/submit-button";
import { AutoSubmitSelect, FilterSelect } from "@/components/auto-submit-select";
import { PriorityTag, ProgressBar, STATUS_STYLES, StatusPill } from "@/components/ticket-bits";
import { addTask, setTicketAssignee, setTicketStatus } from "../actions";
import { PersonalTasks } from "./personal-tasks";
import { Lock } from "@/components/lock";
import { DatePicker } from "@/components/date-picker";

type Ticket = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
  event_id: string;
  done_at: string | null;
  updated_at: string;
  is_private: boolean;
};

type Search = Promise<{ view?: string; who?: string; event?: string; show?: string }>;

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export default async function TicketsPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const { supabase, user, team, events, event: currentEvent, mode } = await requireEvent();
  if (mode === "personal") {
    return <PersonalTasks supabase={supabase} event={currentEvent} showDone={params.show === "done"} />;
  }
  const teamEvents = events.filter((e) => e.team_id === team.id);
  const people = await teamPeople(supabase, team.id, user.id);

  const view = params.view === "list" ? "list" : "board";
  const eventFilter = teamEvents.some((e) => e.id === params.event) ? params.event! : "all";
  const who = params.who === "me" ? user.id : params.who ?? "all";
  const whoKey = params.who === "me" ? "me" : params.who ?? "all";

  const eventIds = eventFilter === "all" ? teamEvents.map((e) => e.id) : [eventFilter];
  const [{ data }, { data: commentRows }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, number, title, status, priority, due_date, assignee_id, event_id, done_at, updated_at, is_private")
      .in("event_id", eventIds),
    supabase.from("ticket_comments").select("task_id").in("event_id", eventIds),
  ]);
  const commentCount = new Map<string, number>();
  for (const c of commentRows ?? []) commentCount.set(c.task_id, (commentCount.get(c.task_id) ?? 0) + 1);

  const today = todayISO();
  const all = ((data ?? []) as Ticket[]).sort(
    (a, b) =>
      (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2) ||
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
      a.number - b.number
  );
  const eventName = new Map(teamEvents.map((e) => [e.id, e.name]));
  const personById = new Map(people.map((p) => [p.id, p]));

  const shown = all.filter((t) =>
    who === "all" ? true : who === "unassigned" ? !t.assignee_id : t.assignee_id === who
  );

  const count = (list: Ticket[]) => ({
    todo: list.filter((t) => t.status === "todo").length,
    in_progress: list.filter((t) => t.status === "in_progress").length,
    blocked: list.filter((t) => t.status === "blocked").length,
    done: list.filter((t) => t.status === "done").length,
  });
  const shownCounts = count(shown);
  const overdue = shown.filter((t) => t.status !== "done" && t.due_date && t.due_date < today).length;
  const pctDone = shown.length ? Math.round((shownCounts.done / shown.length) * 100) : 0;

  const unassigned = all.filter((t) => !t.assignee_id);
  const teamRows: { key: string; person: Person | null; list: Ticket[] }[] = [
    ...people.map((p) => ({ key: p.id, person: p, list: all.filter((t) => t.assignee_id === p.id) })),
    ...(unassigned.length ? [{ key: "unassigned", person: null, list: unassigned }] : []),
  ];

  const q = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const base: Record<string, string> = {};
    if (view !== "board") base.view = view;
    if (whoKey !== "all") base.who = whoKey;
    if (eventFilter !== "all") base.event = eventFilter;
    for (const [k, v] of Object.entries({ ...base, ...patch })) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `/tickets?${s}` : "/tickets";
  };

  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...people.map((p) => ({ value: p.id, label: p.id === user.id ? `${p.name} (me)` : p.name })),
  ];
  const statusOptions = TICKET_STATUSES.map((s) => ({ value: s.value, label: s.label }));
  const whoLabel =
    whoKey === "all"
      ? "Everyone"
      : whoKey === "me"
        ? "You"
        : whoKey === "unassigned"
          ? "Unassigned"
          : personById.get(whoKey)?.name ?? "Teammate";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-accent">{team.name}</p>
          <h1 className="h-display mt-1 text-4xl">Tickets</h1>
          <p className="mt-1 text-muted">Assign tickets to your team, and take a look at the progress.</p>
        </div>
        <div className="flex rounded-lg border border-line bg-white p-0.5 text-sm">
          <Link href={q({ view: null })} className={`rounded-md px-3 py-1.5 ${view === "board" ? "bg-accent-soft text-accent-dark" : "text-muted"}`}>
            Board
          </Link>
          <Link href={q({ view: "list" })} className={`rounded-md px-3 py-1.5 ${view === "list" ? "bg-accent-soft text-accent-dark" : "text-muted"}`}>
            List
          </Link>
        </div>
      </div>

      {/* Quick add */}
      <form action={addTask} className="card flex flex-wrap items-center gap-2 p-3">
        <input
          name="title"
          required
          placeholder="Ticket title, e.g. Book the DJ"
          className="input min-w-[220px] flex-[2]"
        />
        <select name="assignee_id" defaultValue={whoKey === "me" ? user.id : personById.has(whoKey) ? whoKey : ""} className="input select-placeholder w-auto" aria-label="Assign to">
          {assigneeOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.value ? `→ ${o.label}` : "Unassigned"}</option>
          ))}
        </select>
        {teamEvents.length > 1 && (
          <select name="event_id" defaultValue={eventFilter !== "all" ? eventFilter : currentEvent.id} className="input w-auto" aria-label="Event">
            {teamEvents.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        )}
        {teamEvents.length === 1 && <input type="hidden" name="event_id" value={teamEvents[0].id} />}
        <select name="priority" defaultValue="" className="input select-placeholder w-auto" aria-label="Priority level">
          <option value="">Priority level</option>
          {TICKET_PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <DatePicker name="due_date" placeholder="Due date" prefix="Due " short className="w-auto min-w-[9.5rem]" ariaLabel="Due date" />
        <label
          className="flex cursor-pointer select-none items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted transition hover:bg-paper has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent-dark"
          title="Only you and the person you assign can see a private ticket"
        >
          <input type="checkbox" name="is_private" className="sr-only" />
          <Lock />
          Private
        </label>
        <SubmitButton pendingText="Adding…">Add</SubmitButton>
      </form>

      {/* Team Progress */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="h-display text-2xl">Team Progress</h2>
          {teamEvents.length > 1 && (
            <FilterSelect
              param="event"
              value={eventFilter}
              ariaLabel="Filter by event"
              className="input w-auto py-1.5 text-sm"
              options={[{ value: "all", label: "All events" }, ...teamEvents.map((e) => ({ value: e.id, label: e.name }))]}
            />
          )}
        </div>
        {all.length === 0 ? (
          <Empty>No tickets yet. Add one above and assign it to someone on your team.</Empty>
        ) : (
          <ul className="space-y-1">
            {teamRows.map(({ key, person, list }) => {
              const c = count(list);
              const open = list.length - c.done;
              const pct = list.length ? Math.round((c.done / list.length) * 100) : 0;
              const late = list.filter((t) => t.status !== "done" && t.due_date && t.due_date < today).length;
              const active = whoKey === key || (whoKey === "me" && key === user.id);
              return (
                <li key={key}>
                  <Link
                    href={q({ who: active ? null : key === user.id ? "me" : key })}
                    className={`grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 rounded-xl px-3 py-2.5 transition sm:grid-cols-[auto_180px_1fr_auto] ${
                      active ? "bg-accent-soft" : "hover:bg-paper"
                    }`}
                  >
                    <Avatar id={person?.id ?? null} name={person?.name ?? null} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {person ? person.name : "Unassigned"}
                        {person?.id === user.id && <span className="text-muted"> (you)</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {open} open{c.blocked ? ` · ${c.blocked} blocked` : ""}
                        {late ? <span className="text-amber"> · {late} overdue</span> : null}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <ProgressBar
                        counts={c}
                        className="h-2.5"
                      />
                    </div>
                    <p className="hidden w-20 text-right text-sm tabular-nums text-muted sm:block">
                      {list.length ? `${pct}% done` : "—"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-line pt-3 text-xs text-muted">
          {TICKET_STATUSES.map((s) => (
            <span key={s.value} className="flex items-center gap-1.5">
              <i className={`h-2 w-2 rounded-full ${STATUS_STYLES[s.value].bar}`} /> {s.label}
            </span>
          ))}
        </div>
      </section>

      {/* Filter summary */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "Everyone" },
            { key: "me", label: "Assigned to me" },
            { key: "unassigned", label: "Unassigned" },
          ].map((f) => (
            <Link
              key={f.key}
              href={q({ who: f.key === "all" ? null : f.key })}
              className={`rounded-full border px-3 py-1 text-sm ${
                whoKey === f.key ? "border-accent bg-accent-soft text-accent-dark" : "border-line bg-white text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </Link>
          ))}
          {!["all", "me", "unassigned"].includes(whoKey) && (
            <span className="rounded-full border border-accent bg-accent-soft px-3 py-1 text-sm text-accent-dark">
              {whoLabel} <Link href={q({ who: null })} className="ml-1">×</Link>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Open" value={shown.length - shownCounts.done} />
          <Stat label="In progress" value={shownCounts.in_progress} />
          <Stat label="Blocked" value={shownCounts.blocked} warn={shownCounts.blocked > 0} />
          <Stat label="Overdue" value={overdue} warn={overdue > 0} />
          <Stat label="Done" value={shownCounts.done} sub={shown.length ? `${pctDone}% of ${shown.length}` : undefined} />
        </div>
      </section>

      {/* Tickets */}
      {shown.length === 0 ? (
        <Empty>{all.length ? `No tickets for ${whoLabel.toLowerCase()} here.` : "Nothing here yet."}</Empty>
      ) : view === "board" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {TICKET_STATUSES.map((col) => {
              const items = shown.filter((t) => t.status === col.value);
              return (
                <div key={col.value} className="min-w-0 rounded-2xl bg-[#f3eee6] p-2.5">
                  <div className="mb-2.5 flex items-center justify-between px-1.5 pt-0.5">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
                      <i className={`h-2 w-2 rounded-full ${STATUS_STYLES[col.value].dot}`} />
                      {col.label}
                    </span>
                    <span className="text-xs tabular-nums text-muted">{items.length}</span>
                  </div>
                  <ul className="space-y-2">
                    {items.length === 0 && (
                      <li className="rounded-xl border border-dashed border-[#e2d9cc] px-3 py-4 text-center text-xs text-muted/80">
                        Nothing here
                      </li>
                    )}
                    {items.map((t) => {
                      const person = t.assignee_id ? personById.get(t.assignee_id) : null;
                      const late = t.status !== "done" && t.due_date && t.due_date < today;
                      return (
                        <li key={t.id} className="card min-w-0 p-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
                          <Link href={`/tickets/${t.id}`} className="block">
                            <p className="flex items-center gap-1 truncate text-[11px] font-medium tabular-nums text-muted">
                              {t.is_private && <span className="text-accent"><Lock className="h-3 w-3" /></span>}
                              #{t.number}
                              {eventFilter === "all" && teamEvents.length > 1 ? ` · ${eventName.get(t.event_id)}` : ""}
                            </p>
                            <p className={`mt-0.5 break-words text-sm font-medium leading-snug ${t.status === "done" ? "text-muted line-through" : "hover:text-accent"}`}>
                              {t.title}
                            </p>
                          </Link>

                          {/* Who, priority, when */}
                          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <Avatar id={person?.id ?? null} name={person?.name ?? null} size="sm" />
                              <span className="truncate text-xs text-muted">
                                {person ? person.name.split(" ")[0] : "Unassigned"}
                              </span>
                            </span>
                            <PriorityTag priority={t.priority} quiet />
                            {t.due_date && t.status !== "done" && (
                              <span className={`whitespace-nowrap text-xs ${late ? "text-amber" : "text-muted"}`}>
                                {relativeDue(t.due_date)}
                              </span>
                            )}
                          </div>

                          {/* Comments and quick move */}
                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2">
                            <CommentCount n={commentCount.get(t.id) ?? 0} href={`/tickets/${t.id}#comments`} />
                            <AutoSubmitSelect
                              action={setTicketStatus}
                              name="status"
                              value={t.status}
                              hidden={{ id: t.id }}
                              options={statusOptions}
                              ariaLabel="Move ticket"
                              className="ml-auto max-w-full cursor-pointer rounded-md border border-line bg-white px-1.5 py-0.5 text-[11px] text-muted hover:border-accent/50"
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-2 font-medium">Ticket</th>
                {teamEvents.length > 1 && <th className="px-3 py-2 font-medium">Event</th>}
                <th className="px-3 py-2 font-medium">Assignee</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((t) => {
                const late = t.status !== "done" && t.due_date && t.due_date < today;
                return (
                  <tr key={t.id} className="hover:bg-paper/60">
                    <td className="px-4 py-2.5">
                      <Link href={`/tickets/${t.id}`} className="mr-2 inline-flex items-baseline gap-2 hover:text-accent">
                        <span className="flex items-center gap-1 text-xs tabular-nums text-muted">
                          {t.is_private && <span className="text-accent"><Lock className="h-3 w-3" /></span>}#{t.number}
                        </span>
                        <span className={`font-medium ${t.status === "done" ? "text-muted line-through" : ""}`}>{t.title}</span>
                      </Link>
                      <CommentCount n={commentCount.get(t.id) ?? 0} href={`/tickets/${t.id}#comments`} />
                    </td>
                    {teamEvents.length > 1 && <td className="px-3 py-2.5 text-muted">{eventName.get(t.event_id)}</td>}
                    <td className="px-3 py-2.5">
                      <AutoSubmitSelect
                        action={setTicketAssignee}
                        name="assignee_id"
                        value={t.assignee_id ?? ""}
                        hidden={{ id: t.id }}
                        options={assigneeOptions}
                        ariaLabel="Assignee"
                        className="cursor-pointer rounded-md border border-transparent bg-transparent px-1 py-0.5 hover:border-line"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <AutoSubmitSelect
                        action={setTicketStatus}
                        name="status"
                        value={t.status}
                        hidden={{ id: t.id }}
                        options={statusOptions}
                        ariaLabel="Status"
                        className="cursor-pointer rounded-md border border-transparent bg-transparent px-1 py-0.5 hover:border-line"
                      />
                    </td>
                    <td className="px-3 py-2.5"><PriorityTag priority={t.priority} /></td>
                    <td className={`px-4 py-2.5 ${late ? "text-amber" : "text-muted"}`}>
                      {t.due_date ? (t.status === "done" ? prettyDate(t.due_date) : relativeDue(t.due_date)) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted">
        Tip: click a person under Team Progress to see only their tickets. Open a ticket to add details
        and comments. <StatusPill status="blocked" /> means someone is waiting on something.
      </p>
    </div>
  );
}

function CommentCount({ n, href }: { n: number; href: string }) {
  if (!n) return null;
  return (
    <Link href={href} title={`${n} comment${n === 1 ? "" : "s"}`} className="inline-flex items-center gap-1 text-xs text-muted hover:text-accent">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 5h16v11H9l-5 4z" strokeLinejoin="round" />
      </svg>
      {n}
    </Link>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: number; sub?: string; warn?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`h-display mt-1 text-3xl tabular-nums ${warn ? "text-amber" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
