import Link from "next/link";
import { requireWedding } from "@/lib/wedding";
import { addDaysISO, prettyDate, relativeDue, todayISO } from "@/lib/format";
import { Empty, PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { addTask, deleteTask, toggleTask } from "../actions";

type Task = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  done: boolean;
  vendor_id: string | null;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const showDone = show === "done";
  const { supabase } = await requireWedding();
  const today = todayISO();
  const nextWeek = addDaysISO(7);

  const [{ data: taskRows }, { data: vendorRows }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, notes, due_date, done, vendor_id")
      .eq("done", showDone)
      .order(showDone ? "done_at" : "due_date", { ascending: !showDone, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase.from("vendors").select("id, name").order("name"),
  ]);

  const tasks = (taskRows ?? []) as Task[];
  const vendors = vendorRows ?? [];
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));

  const groups = showDone
    ? [{ title: "Completed", items: tasks }]
    : [
        { title: "Overdue", items: tasks.filter((t) => t.due_date && t.due_date < today), warn: true },
        { title: "This week", items: tasks.filter((t) => t.due_date && t.due_date >= today && t.due_date <= nextWeek) },
        { title: "Coming up", items: tasks.filter((t) => t.due_date && t.due_date > nextWeek) },
        { title: "Someday", items: tasks.filter((t) => !t.due_date) },
      ];

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Everything on your plate, sorted by when it's due."
        action={
          <div className="flex rounded-lg border border-line bg-white p-0.5 text-sm">
            <Link href="/tasks" className={`rounded-md px-3 py-1.5 ${!showDone ? "bg-accent-soft text-accent-dark" : "text-muted"}`}>
              To do
            </Link>
            <Link href="/tasks?show=done" className={`rounded-md px-3 py-1.5 ${showDone ? "bg-accent-soft text-accent-dark" : "text-muted"}`}>
              Done
            </Link>
          </div>
        }
      />

      {!showDone && (
        <form action={addTask} className="card mb-8 flex flex-wrap gap-2 p-3">
          <input name="title" required placeholder="Add a task… e.g. Book hair & makeup trial" className="input min-w-[200px] flex-1 border-0 focus:ring-0" />
          <input name="due_date" type="date" className="input w-auto" aria-label="Due date" />
          <select name="vendor_id" defaultValue="" className="input w-auto" aria-label="Vendor">
            <option value="">No vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <SubmitButton pendingText="Adding…">Add</SubmitButton>
        </form>
      )}

      {tasks.length === 0 && (
        <Empty>{showDone ? "Nothing completed yet — you'll get there!" : "All clear. Add your first task above."}</Empty>
      )}

      <div className="space-y-6">
        {groups.map((g) =>
          g.items.length === 0 ? null : (
            <section key={g.title}>
              <h2 className={`mb-2 text-xs font-medium uppercase tracking-wider ${"warn" in g && g.warn ? "text-amber" : "text-muted"}`}>
                {g.title} · {g.items.length}
              </h2>
              <ul className="card divide-y divide-line">
                {g.items.map((t) => (
                  <li key={t.id} className="group flex items-center gap-3 px-4 py-3">
                    <form action={toggleTask}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="done" value={String(!t.done)} />
                      <button
                        aria-label={t.done ? "Mark not done" : "Mark done"}
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-[11px] ${
                          t.done ? "border-sage bg-sage text-white" : "border-line hover:border-accent"
                        }`}
                      >
                        {t.done ? "✓" : ""}
                      </button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <p className={t.done ? "text-muted line-through" : ""}>{t.title}</p>
                      {(t.due_date || t.vendor_id) && (
                        <p className="text-xs text-muted">
                          {t.due_date && (
                            <span className={!t.done && t.due_date < today ? "text-amber" : ""}>
                              {t.done ? prettyDate(t.due_date) : relativeDue(t.due_date)}
                            </span>
                          )}
                          {t.due_date && t.vendor_id ? " · " : ""}
                          {t.vendor_id && (
                            <Link href={`/vendors/${t.vendor_id}`} className="hover:text-accent">
                              {vendorName.get(t.vendor_id)}
                            </Link>
                          )}
                        </p>
                      )}
                    </div>
                    <form action={deleteTask} className="opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                      <input type="hidden" name="id" value={t.id} />
                      <button aria-label="Delete task" className="text-muted hover:text-accent">×</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )
        )}
      </div>
    </div>
  );
}
