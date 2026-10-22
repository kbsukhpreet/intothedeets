import Link from "next/link";
import { addDaysISO, prettyDate, relativeDue, todayISO, TICKET_PRIORITIES } from "@/lib/format";
import type { EventRow } from "@/lib/event";
import { Empty, PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { DatePicker } from "@/components/date-picker";
import { PriorityTag } from "@/components/ticket-bits";
import { addTask, toggleTask } from "../actions";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  vendor_id: string | null;
};

type Supabase = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

/** The simple "just me" task list: checkboxes grouped by when things are due. */
export async function PersonalTasks({
  supabase,
  event,
  showDone,
}: {
  supabase: Supabase;
  event: EventRow;
  showDone: boolean;
}) {
  const today = todayISO();
  const nextWeek = addDaysISO(7);

  const base = supabase
    .from("tasks")
    .select("id, title, status, priority, due_date, vendor_id")
    .eq("event_id", event.id);
  const [{ data: taskRows }, { data: vendorRows }, { count: doneCount }] = await Promise.all([
    showDone
      ? base.eq("status", "done").order("done_at", { ascending: false })
      : base
          .neq("status", "done")
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true }),
    supabase.from("vendors").select("id, name").eq("event_id", event.id).order("name"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("status", "done"),
  ]);

  const tasks = (taskRows ?? []) as Task[];
  const vendors = vendorRows ?? [];
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));

  const groups = showDone
    ? [{ title: "Completed", items: tasks, warn: false }]
    : [
        { title: "Overdue", items: tasks.filter((t) => t.due_date && t.due_date < today), warn: true },
        { title: "This week", items: tasks.filter((t) => t.due_date && t.due_date >= today && t.due_date <= nextWeek), warn: false },
        { title: "Coming up", items: tasks.filter((t) => t.due_date && t.due_date > nextWeek), warn: false },
        { title: "Someday", items: tasks.filter((t) => !t.due_date), warn: false },
      ];

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={`Everything on your plate for ${event.name}, sorted by when it's due.`}
        action={
          <div className="flex rounded-lg border border-line bg-white p-0.5 text-sm">
            <Link href="/tickets" className={`rounded-md px-3 py-1.5 ${!showDone ? "bg-accent-soft text-accent-dark" : "text-muted"}`}>
              To do
            </Link>
            <Link href="/tickets?show=done" className={`rounded-md px-3 py-1.5 ${showDone ? "bg-accent-soft text-accent-dark" : "text-muted"}`}>
              Done{doneCount ? ` · ${doneCount}` : ""}
            </Link>
          </div>
        }
      />

      {!showDone && (
        <form action={addTask} className="card mb-8 flex flex-wrap gap-2 p-3">
          <input type="hidden" name="assignee_id" value="me" />
          <input type="hidden" name="event_id" value={event.id} />
          <input
            name="title"
            required
            placeholder="Add a task… e.g. Book hair & makeup trial"
            className="input min-w-[200px] flex-1 border-0 focus:ring-0"
          />
          <DatePicker name="due_date" placeholder="Due date" prefix="Due " short className="w-auto min-w-[9.5rem]" ariaLabel="Due date" />
          <select name="priority" defaultValue="" className="input select-placeholder w-auto" aria-label="Priority level">
            <option value="">Priority level</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {vendors.length > 0 && (
            <select name="vendor_id" defaultValue="" className="input select-placeholder w-auto" aria-label="Vendor">
              <option value="">No vendor</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}
          <SubmitButton pendingText="Adding…">Add</SubmitButton>
        </form>
      )}

      {tasks.length === 0 && (
        <Empty>{showDone ? "Nothing completed yet. You'll get there!" : "All clear. Add your first task above."}</Empty>
      )}

      <div className="space-y-6">
        {groups.map((g) =>
          g.items.length === 0 ? null : (
            <section key={g.title}>
              <h2 className={`mb-2 text-xs font-medium uppercase tracking-wider ${g.warn ? "text-amber" : "text-muted"}`}>
                {g.title} · {g.items.length}
              </h2>
              <ul className="card divide-y divide-line">
                {g.items.map((t) => {
                  const done = t.status === "done";
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <form action={toggleTask}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="done" value={String(!done)} />
                        <button
                          aria-label={done ? "Mark not done" : "Mark done"}
                          className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[11px] ${
                            done ? "border-sage bg-sage text-white" : "border-line hover:border-accent"
                          }`}
                        >
                          {done ? "✓" : ""}
                        </button>
                      </form>
                      <Link href={`/tickets/${t.id}`} className="min-w-0 flex-1">
                        <p className={`truncate ${done ? "text-muted line-through" : "hover:text-accent"}`}>{t.title}</p>
                        <p className="flex flex-wrap gap-x-2 text-xs text-muted">
                          {t.status === "in_progress" && <span>In progress</span>}
                          {t.status === "blocked" && <span className="text-amber">Waiting on something</span>}
                          {t.due_date && (
                            <span className={!done && t.due_date < today ? "text-amber" : ""}>
                              {done ? prettyDate(t.due_date) : relativeDue(t.due_date)}
                            </span>
                          )}
                          {t.vendor_id && <span>{vendorName.get(t.vendor_id)}</span>}
                        </p>
                      </Link>
                      <PriorityTag priority={t.priority} quiet />
                    </li>
                  );
                })}
              </ul>
            </section>
          )
        )}
      </div>
    </div>
  );
}
