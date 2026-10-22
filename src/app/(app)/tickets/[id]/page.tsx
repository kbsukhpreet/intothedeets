import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEvent, teamPeople } from "@/lib/event";
import { TICKET_PRIORITIES, TICKET_STATUSES, prettyDate, relativeDue, timeAgo, todayISO } from "@/lib/format";
import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmButton } from "@/components/confirm-button";
import { PriorityTag, StatusPill } from "@/components/ticket-bits";
import { addComment, deleteComment, deleteTask, editComment, updateTicket } from "../../actions";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, events, teams, mode } = await requireEvent();
  const personal = mode === "personal";
  const noun = personal ? "task" : "ticket";

  const { data: t } = await supabase
    .from("tasks")
    .select("id, number, title, notes, status, priority, due_date, assignee_id, event_id, vendor_id, created_by, created_at, updated_at, done_at")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const event = events.find((e) => e.id === t.event_id);
  if (!event) notFound();
  const team = teams.find((x) => x.id === event.team_id);

  const [people, { data: comments }, { data: vendors }] = await Promise.all([
    teamPeople(supabase, event.team_id, user.id),
    supabase
      .from("ticket_comments")
      .select("id, body, author_id, created_at, edited_at")
      .eq("task_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("vendors").select("id, name").eq("event_id", event.id).order("name"),
  ]);

  const personById = new Map(people.map((p) => [p.id, p]));
  const assignee = t.assignee_id ? personById.get(t.assignee_id) : null;
  const creator = t.created_by ? personById.get(t.created_by) : null;
  const vendor = (vendors ?? []).find((v) => v.id === t.vendor_id);
  const late = t.status !== "done" && t.due_date && t.due_date < todayISO();

  return (
    <div className="space-y-6">
      <Link href="/tickets" className="text-sm text-muted hover:text-ink">
        ← All {noun}s
      </Link>

      <div>
        <p className="text-sm text-muted">
          {!personal && <span className="tabular-nums">#{t.number} · </span>}{event.name}
          {team && !personal ? ` · ${team.name}` : ""}
        </p>
        <h1 className="h-display mt-1 text-3xl sm:text-4xl">{t.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <StatusPill status={t.status} />
          <PriorityTag priority={t.priority} />
          {!personal && (
            <span className="flex items-center gap-1.5 text-muted">
              <Avatar id={assignee?.id ?? null} name={assignee?.name ?? null} size="sm" />
              {assignee ? assignee.name : "Unassigned"}
            </span>
          )}
          {t.due_date && (
            <span className={late ? "text-amber" : "text-muted"}>
              Due {t.status === "done" ? prettyDate(t.due_date, true) : relativeDue(t.due_date)}
            </span>
          )}
          {vendor && (
            <Link href={`/vendors/${vendor.id}`} className="text-muted hover:text-accent">
              Vendor: {vendor.name}
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Updates */}
        <section id="comments" className="card scroll-mt-6 p-5">
          <h2 className="h-display text-2xl">
            {personal ? "Notes" : "Comments"}
            {(comments ?? []).length > 0 && (
              <span className="ml-2 align-middle text-sm font-normal text-muted">{(comments ?? []).length}</span>
            )}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {personal
              ? "Keep a running log: who you called, what they said, what's next."
              : "Ask questions, share what you heard back, or say what you're stuck on."}
          </p>

          <ol className="mt-5 space-y-5">
            {(comments ?? []).length === 0 && (
              <li className="text-sm text-muted">{personal ? "No notes yet." : "No comments yet. Start the conversation below."}</li>
            )}
            {(comments ?? []).map((c) => {
              const author = c.author_id ? personById.get(c.author_id) : null;
              const mine = c.author_id === user.id;
              return (
                <li key={c.id} className="flex gap-3">
                  <Avatar id={author?.id ?? c.author_id} name={author?.name ?? "Former member"} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{mine ? "You" : author?.name ?? "Former member"}</span>
                      <span className="ml-2 text-xs text-muted">
                        {timeAgo(c.created_at)}
                        {c.edited_at ? " · edited" : ""}
                      </span>
                    </p>
                    <div className="mt-1 rounded-xl rounded-tl-sm bg-paper px-3.5 py-2.5">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
                    </div>
                    {mine && (
                      <details className="group mt-1">
                        <summary className="inline-flex cursor-pointer list-none gap-3 text-xs text-muted">
                          <span className="hover:text-accent">Edit</span>
                        </summary>
                        <form action={editComment} className="mt-2 space-y-2">
                          <input type="hidden" name="id" value={c.id} />
                          <textarea name="body" required rows={3} defaultValue={c.body} className="input resize-y" />
                          <div className="flex items-center gap-3">
                            <SubmitButton className="btn-ghost py-1.5" pendingText="Saving…">Save</SubmitButton>
                          </div>
                        </form>
                        <form action={deleteComment} className="mt-2">
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmButton message="Delete this comment?" className="text-xs text-muted hover:text-accent">
                            Delete comment
                          </ConfirmButton>
                        </form>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <form action={addComment} className="mt-6 space-y-2 rounded-xl border border-line p-3">
            <input type="hidden" name="task_id" value={t.id} />
            <textarea
              name="body"
              required
              rows={3}
              placeholder={personal ? "Add a note…" : "Write a comment…"}
              className="input resize-y border-0 px-1 focus:ring-0"
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
              <label className="text-xs text-muted" htmlFor="move">Also move to</label>
              <select id="move" name="status" defaultValue="" className="input w-auto py-1 text-xs">
                <option value="">(keep {TICKET_STATUSES.find((s) => s.value === t.status)?.label})</option>
                {TICKET_STATUSES.filter((s) => s.value !== t.status).map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <SubmitButton className="btn-primary ml-auto py-1.5" pendingText="Posting…">
                {personal ? "Add note" : "Comment"}
              </SubmitButton>
            </div>
          </form>
        </section>

        {/* Details */}
        <aside className="card h-fit p-5">
          <h2 className="h-display text-xl">Details</h2>
          <form action={updateTicket} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={t.id} />
            <div>
              <label className="label" htmlFor="title">Title</label>
              <input id="title" name="title" required defaultValue={t.title} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={t.status} className="input">
                  {TICKET_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="priority">Priority</label>
                <select id="priority" name="priority" defaultValue={t.priority} className="input">
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {personal ? (
              <input type="hidden" name="assignee_id" value={t.assignee_id ?? ""} />
            ) : (
            <div>
              <label className="label" htmlFor="assignee_id">Assigned to</label>
              <select id="assignee_id" name="assignee_id" defaultValue={t.assignee_id ?? ""} className="input">
                <option value="">Unassigned</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.id === user.id ? `${p.name} (me)` : p.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">The person you assign gets an email.</p>
            </div>
            )}
            <div>
              <label className="label" htmlFor="due_date">Due date</label>
              <input id="due_date" name="due_date" type="date" defaultValue={t.due_date ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="vendor_id">Vendor (optional)</label>
              <select id="vendor_id" name="vendor_id" defaultValue={t.vendor_id ?? ""} className="input">
                <option value="">None</option>
                {(vendors ?? []).map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="notes">Description</label>
              <textarea
                id="notes"
                name="notes"
                rows={5}
                defaultValue={t.notes ?? ""}
                placeholder="What needs to happen, links, details…"
                className="input resize-y"
              />
            </div>
            <SubmitButton className="btn-primary w-full">Save changes</SubmitButton>
          </form>

          <div className="mt-5 space-y-1 border-t border-line pt-4 text-xs text-muted">
            <p>Created {timeAgo(t.created_at)}{creator && !personal ? ` by ${creator.name}` : ""}</p>
            <p>Last updated {timeAgo(t.updated_at)}</p>
            {t.done_at && <p>Completed {timeAgo(t.done_at)}</p>}
          </div>

          <form action={deleteTask} className="mt-4">
            <input type="hidden" name="id" value={t.id} />
            <input type="hidden" name="back" value="/tickets" />
            <ConfirmButton message={personal ? `Delete "${t.title}"? This can't be undone.` : `Delete ticket #${t.number}? This can't be undone.`} className="text-xs text-muted hover:text-accent">
              Delete {noun}
            </ConfirmButton>
          </form>
        </aside>
      </div>
    </div>
  );
}
