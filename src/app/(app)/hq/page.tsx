import Link from "next/link";
import { requireEvent } from "@/lib/event";
import {
  addDaysISO,
  channelLabel,
  daysUntil,
  money,
  prettyDate,
  relativeDue,
  todayISO,
} from "@/lib/format";
import { Empty } from "@/components/page-header";
import { toggleTask } from "../actions";

type Payment = {
  id: string;
  label: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  vendor_id: string | null;
};
type Vendor = { id: string; name: string; category: string; status: string; contract_total: number };
type Task = {
  id: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  vendor_id: string | null;
  assignee_id: string | null;
};
type Note = {
  id: string;
  summary: string;
  note_date: string;
  channel: string;
  vendor_id: string;
};

export default async function EventDashboardPage() {
  const { supabase, event, user, mode } = await requireEvent();
  const personal = mode === "personal";
  const today = todayISO();
  const in90 = addDaysISO(90);

  const [vendorsRes, paymentsRes, tasksRes, notesRes, membersRes, profileRes] = await Promise.all([
    supabase.from("vendors").select("id, name, category, status, contract_total").eq("event_id", event.id),
    supabase.from("payments").select("id, label, amount, due_date, paid, vendor_id").eq("event_id", event.id),
    supabase
      .from("tasks")
      .select("id, number, title, status, priority, due_date, vendor_id, assignee_id")
      .eq("event_id", event.id)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("vendor_notes")
      .select("id, summary, note_date, channel, vendor_id")
      .eq("event_id", event.id)
      .order("note_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("team_members").select("user_id").eq("team_id", event.team_id),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const vendors = (vendorsRes.data ?? []) as Vendor[];
  const payments = (paymentsRes.data ?? []) as Payment[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const notes = (notesRes.data ?? []) as Note[];
  const memberCount = membersRes.data?.length ?? 1;
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));

  // Countdown
  const days = event.event_date ? daysUntil(event.event_date) : null;

  // Money
  const committed = vendors
    .filter((v) => v.status !== "declined")
    .reduce((s, v) => s + Number(v.contract_total), 0);
  const paid = payments.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const unpaid = payments
    .filter((p) => !p.paid && p.due_date)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!));
  const overduePayments = unpaid.filter((p) => p.due_date! < today);
  const due90 = unpaid.filter((p) => p.due_date! <= in90);
  const due90Total = due90.reduce((s, p) => s + Number(p.amount), 0);

  // Tasks
  const overdueTasks = tasks.filter((t) => t.due_date && t.due_date < today);
  const mine = personal ? tasks : tasks.filter((t) => t.assignee_id === user.id);
  const topTasks = mine.slice(0, 6);

  // Follow-ups: vendors "in talks" with no conversation in the last 7 days
  const lastContact = new Map<string, string>();
  for (const n of notes) if (!lastContact.has(n.vendor_id)) lastContact.set(n.vendor_id, n.note_date);
  const weekAgo = addDaysISO(-7);
  const followUps = vendors
    .filter((v) => v.status === "contacted")
    .filter((v) => !lastContact.has(v.id) || lastContact.get(v.id)! < weekAgo);

  const greetingName = (profileRes.data?.full_name ?? "").split(" ")[0] || "back";
  const isNew = vendors.length === 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="card relative overflow-hidden bg-accent p-7 text-white sm:p-9">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full border-[18px] border-white/10" />
        <div className="absolute -right-24 top-6 h-48 w-48 rounded-full border-[18px] border-white/10" />
        <p className="h-display relative max-w-[85%] text-2xl leading-snug sm:text-3xl">
          {personal ? `Welcome ${greetingName}!` : `Welcome ${greetingName} to ${event.name}!`}
        </p>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-white/70">{event.event_type}</p>
        {days !== null ? (
          <>
            <p className="h-display mt-1 text-6xl sm:text-7xl">
              {days > 0 ? days : days === 0 ? "Today" : "Done!"}
            </p>
            <p className="mt-1 text-white/85">
              {days > 0
                ? `day${days === 1 ? "" : "s"} until ${event.name} · ${prettyDate(event.event_date, true)}`
                : days === 0
                  ? `${event.name} is today. Enjoy every second.`
                  : `${event.name} has wrapped. Congratulations!`}
            </p>
          </>
        ) : (
          <>
            <p className="h-display mt-1 text-4xl">{event.name}</p>
            <Link href="/settings" className="mt-2 inline-block text-white/85 underline">
              Add your event date to start the countdown
            </Link>
          </>
        )}
      </section>

      {/* Today at a glance */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Due in next 90 days"
          value={money(due90Total)}
          sub={`${due90.length} payment${due90.length === 1 ? "" : "s"}`}
          tone={overduePayments.length ? "warn" : undefined}
          href="/budget"
        />
        <Stat
          label={personal ? "Open tasks" : "Open tickets"}
          value={String(tasks.length)}
          sub={overdueTasks.length ? `${overdueTasks.length} overdue` : personal ? "None overdue" : `${mine.length} assigned to you`}
          tone={overdueTasks.length ? "warn" : undefined}
          href="/tickets"
        />
        <Stat
          label="Booked vendors"
          value={`${vendors.filter((v) => v.status === "booked").length}`}
          sub={`of ${vendors.filter((v) => v.status !== "declined").length} in play`}
          href="/vendors"
        />
        <Stat
          label="Budget used"
          value={event.total_budget > 0 ? `${Math.round((committed / Number(event.total_budget)) * 100)}%` : money(committed)}
          sub={event.total_budget > 0 ? `${money(committed)} of ${money(event.total_budget)}` : "committed"}
          tone={event.total_budget > 0 && committed > Number(event.total_budget) ? "warn" : undefined}
          href="/budget"
        />
      </section>

      {isNew && (
        <section className="card p-6">
          <h2 className="h-display text-2xl">Get set up in 3 steps</h2>
          <ol className="mt-4 space-y-3 text-sm">
            <Step done={vendors.length > 0} href="/vendors" text="Add the vendors you've booked or are talking to" />
            <Step done={payments.length > 0} href="/vendors" text="Add their payment schedules so we can track what's due" />
            {personal ? (
              <Step done={tasks.length > 0} href="/tickets" text="Add your first few tasks" />
            ) : (
              <Step done={memberCount > 1} href="/team" text="Invite your team, then assign them tickets" />
            )}
          </ol>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payments */}
        <Panel title="Upcoming payments" href="/budget">
          {overduePayments.length > 0 && (
            <p className="mb-3 rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">
              {overduePayments.length} payment{overduePayments.length === 1 ? " is" : "s are"} past due.
            </p>
          )}
          {unpaid.length === 0 ? (
            <Empty>No upcoming payments. Add payment schedules from a vendor&apos;s page.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {unpaid.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.vendor_id ? vendorName.get(p.vendor_id) : p.label}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {p.vendor_id ? `${p.label} · ` : ""}
                      <span className={p.due_date! < today ? "text-amber" : ""}>{relativeDue(p.due_date!)}</span>
                    </p>
                  </div>
                  <span className="font-medium tabular-nums">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Tasks */}
        <Panel title={personal ? "Your tasks" : "Your tickets"} href={personal ? "/tickets" : "/tickets?who=me"}>
          {topTasks.length === 0 ? (
            <Empty>
              {personal
                ? "Nothing on your list. Add tasks from the Tasks page."
                : "Nothing assigned to you for this event. See the whole team on the Tickets page."}
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {topTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <form action={toggleTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="done" value="true" />
                    <button
                      aria-label="Mark done"
                      className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-line hover:border-accent"
                    />
                  </form>
                  <div className="min-w-0 flex-1">
                    <Link href={`/tickets/${t.id}`} className="block truncate hover:text-accent">
                      {!personal && <span className="mr-1.5 text-xs tabular-nums text-muted">#{t.number}</span>}
                      {t.title}
                    </Link>
                    {(t.due_date || t.vendor_id || t.status !== "todo") && (
                      <p className="flex gap-1.5 truncate text-xs text-muted">
                        {[
                          t.status === "in_progress" ? <span key="s">In progress</span> : null,
                          t.status === "blocked" ? <span key="s" className="text-amber">Blocked</span> : null,
                          t.due_date ? (
                            <span key="d" className={t.due_date < today ? "text-amber" : ""}>{relativeDue(t.due_date)}</span>
                          ) : null,
                          t.vendor_id ? <span key="v">{vendorName.get(t.vendor_id)}</span> : null,
                        ]
                          .filter(Boolean)
                          .flatMap((el, i) => (i ? [<span key={`sep${i}`}>·</span>, el] : [el]))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Follow-ups */}
        <Panel title="Vendor follow-ups" href="/vendors">
          {followUps.length === 0 ? (
            <Empty>You&apos;re caught up with every vendor you&apos;re talking to.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {followUps.slice(0, 5).map((v) => (
                <li key={v.id} className="py-3">
                  <Link href={`/vendors/${v.id}`} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{v.name}</p>
                      <p className="text-sm text-muted">
                        {v.category} ·{" "}
                        {lastContact.has(v.id)
                          ? `last heard ${prettyDate(lastContact.get(v.id))}`
                          : "no conversations logged"}
                      </p>
                    </div>
                    <span className="btn-link shrink-0">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Recent notes */}
        <Panel title="Recent conversations" href="/vendors">
          {notes.length === 0 ? (
            <Empty>Log calls, emails and meetings on each vendor&apos;s page so you never lose a detail.</Empty>
          ) : (
            <ul className="space-y-4">
              {notes.slice(0, 4).map((n) => (
                <li key={n.id}>
                  <Link href={`/vendors/${n.vendor_id}`} className="block">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted">
                      {vendorName.get(n.vendor_id)} · {channelLabel(n.channel)} · {prettyDate(n.note_date)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm">{n.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "warn";
  href: string;
}) {
  return (
    <Link href={href} className="card block p-4 transition hover:border-accent/40">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="h-display mt-2 text-3xl tabular-nums">{value}</p>
      <p className={`mt-0.5 text-sm ${tone === "warn" ? "text-amber" : "text-muted"}`}>{sub}</p>
    </Link>
  );
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="h-display text-xl">{title}</h2>
        <Link href={href} className="btn-link">
          See all
        </Link>
      </div>
      {children}
    </section>
  );
}

function Step({ done, href, text }: { done: boolean; href: string; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
          done ? "bg-sage text-white" : "border-2 border-line"
        }`}
      >
        {done ? "✓" : ""}
      </span>
      <Link href={href} className={done ? "text-muted line-through" : "hover:text-accent"}>
        {text}
      </Link>
    </li>
  );
}
