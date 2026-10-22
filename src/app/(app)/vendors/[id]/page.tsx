import Link from "next/link";
import { notFound } from "next/navigation";
import { requireEvent, teamPeople } from "@/lib/event";
import { Avatar } from "@/components/avatar";
import { NOTE_CHANNELS, channelLabel, money, prettyDate, relativeDue, todayISO } from "@/lib/format";
import { Empty, StatusPill } from "@/components/page-header";
import { VendorFields } from "@/components/vendor-fields";
import { SubmitButton } from "@/components/submit-button";
import { DatePicker } from "@/components/date-picker";
import { ConfirmButton } from "@/components/confirm-button";
import {
  addPayment,
  addTask,
  addVendorNote,
  deletePayment,
  deleteVendor,
  deleteVendorNote,
  togglePayment,
  toggleTask,
  updateVendor,
} from "../../actions";

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, event, user, mode } = await requireEvent();
  const personal = mode === "personal";

  const { data: vendor } = await supabase.from("vendors").select("*").eq("id", id).eq("event_id", event.id).maybeSingle();
  if (!vendor) notFound();
  const people = await teamPeople(supabase, event.team_id, user.id);

  const [{ data: notes }, { data: payments }, { data: tasks }] = await Promise.all([
    supabase
      .from("vendor_notes")
      .select("id, note_date, channel, summary")
      .eq("vendor_id", id)
      .order("note_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("id, label, amount, due_date, paid, paid_on")
      .eq("vendor_id", id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("tasks")
      .select("id, number, title, due_date, status, assignee_id")
      .eq("vendor_id", id)
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  const today = todayISO();
  const contract = Number(vendor.contract_total);
  const paid = (payments ?? []).filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const scheduled = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const unscheduled = Math.max(contract - scheduled, 0);

  return (
    <div className="space-y-6">
      <Link href="/vendors" className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-[0_1px_0_rgba(0,0,0,0.03)] transition hover:border-accent/50 hover:text-accent">
        <span aria-hidden className="text-base leading-none">←</span> All Vendors
      </Link>

      {/* Header */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-accent">{vendor.category}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="h-display text-4xl">{vendor.name}</h1>
            <StatusPill status={vendor.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {vendor.contact_name && <span>{vendor.contact_name}</span>}
            {vendor.email && (
              <a href={`mailto:${vendor.email}`} className="hover:text-accent">{vendor.email}</a>
            )}
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="hover:text-accent">{vendor.phone}</a>
            )}
            {vendor.website && (
              <a
                href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent"
              >
                {vendor.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>
        {contract > 0 && (
          <div className="card grid grid-cols-3 gap-6 px-5 py-3 text-center">
            <Money label="Contract" value={contract} />
            <Money label="Paid" value={paid} />
            <Money label="Remaining" value={Math.max(contract - paid, 0)} />
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Conversation log */}
        <section className="card p-5">
          <h2 className="h-display text-2xl">Conversation log</h2>
          <p className="mt-1 text-sm text-muted">
            Jot down what was said on every call, email or meeting — prices, promises, next steps.
          </p>

          <form action={addVendorNote} className="mt-4 space-y-3 rounded-xl bg-paper p-4">
            <input type="hidden" name="vendor_id" value={id} />
            <textarea
              name="summary"
              required
              rows={3}
              placeholder="Discussed centerpieces. They quoted $4,800 and can add more white flowers. Waiting on revised proposal."
              className="input resize-y"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select name="channel" defaultValue="call" className="input w-auto">
                {NOTE_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <DatePicker name="note_date" defaultValue={today} short className="w-auto" ariaLabel="Date of conversation" />
              <SubmitButton className="btn-primary ml-auto">Save note</SubmitButton>
            </div>
          </form>

          <ol className="mt-5 space-y-5">
            {(notes ?? []).length === 0 && <Empty>No conversations logged yet.</Empty>}
            {(notes ?? []).map((n) => (
              <li key={n.id} className="group relative border-l-2 border-accent-soft pl-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  {prettyDate(n.note_date, true)} · {channelLabel(n.channel)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{n.summary}</p>
                <form action={deleteVendorNote} className="absolute right-0 top-0 opacity-0 transition group-hover:opacity-100">
                  <input type="hidden" name="id" value={n.id} />
                  <button className="text-xs text-muted hover:text-accent">Delete</button>
                </form>
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-6">
          {/* Payments */}
          <section className="card p-5">
            <h2 className="h-display text-xl">Payment schedule</h2>
            <ul className="mt-3 divide-y divide-line">
              {(payments ?? []).length === 0 && (
                <li className="pb-2 text-sm text-muted">No payments added yet.</li>
              )}
              {(payments ?? []).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <form action={togglePayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="paid" value={String(!p.paid)} />
                    <button
                      aria-label={p.paid ? "Mark unpaid" : "Mark paid"}
                      className={`flex h-5 w-5 items-center justify-center rounded-md border-2 text-[11px] ${
                        p.paid ? "border-sage bg-sage text-white" : "border-line hover:border-accent"
                      }`}
                    >
                      {p.paid ? "✓" : ""}
                    </button>
                  </form>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${p.paid ? "text-muted line-through" : ""}`}>{p.label}</p>
                    <p className="text-xs text-muted">
                      {p.paid
                        ? `Paid${p.paid_on ? ` ${prettyDate(p.paid_on)}` : ""}`
                        : p.due_date
                          ? <span className={p.due_date < today ? "text-amber" : ""}>Due {relativeDue(p.due_date)}</span>
                          : "No due date"}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums">{money(p.amount)}</span>
                  <form action={deletePayment}>
                    <input type="hidden" name="id" value={p.id} />
                    <button aria-label="Delete payment" className="text-muted hover:text-accent">×</button>
                  </form>
                </li>
              ))}
            </ul>
            {unscheduled > 0 && (
              <p className="mt-2 text-xs text-muted">{money(unscheduled)} of the contract isn&apos;t scheduled yet.</p>
            )}

            <form action={addPayment} className="mt-4 space-y-2 border-t border-line pt-4">
              <input type="hidden" name="vendor_id" value={id} />
              <input name="label" placeholder="Deposit, 2nd payment, final balance…" className="input" required />
              <div className="flex gap-2">
                <input name="amount" inputMode="decimal" placeholder="$ Amount" className="input" required />
                <DatePicker name="due_date" placeholder="Due date" prefix="Due " short align="right" ariaLabel="Payment due date" />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="paid" className="accent-[#a8553f]" /> Already paid
                </label>
                <SubmitButton className="btn-ghost">Add payment</SubmitButton>
              </div>
            </form>
          </section>

          {/* Tickets */}
          <section className="card p-5">
            <h2 className="h-display text-xl">{personal ? "To-dos for this vendor" : "Tickets for this vendor"}</h2>
            <ul className="mt-3 space-y-1">
              {(tasks ?? []).map((t) => {
                const done = t.status === "done";
                const person = t.assignee_id ? people.find((p) => p.id === t.assignee_id) : null;
                return (
                  <li key={t.id} className="flex items-center gap-3 py-1.5">
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
                    <Link href={`/tickets/${t.id}`} className={`min-w-0 flex-1 truncate text-sm hover:text-accent ${done ? "text-muted line-through" : ""}`}>
                      {!personal && <span className="mr-1.5 text-xs tabular-nums text-muted">#{t.number}</span>}
                      {t.title}
                      {t.due_date && !done && (
                        <span className={`ml-2 text-xs ${t.due_date < today ? "text-amber" : "text-muted"}`}>
                          {relativeDue(t.due_date)}
                        </span>
                      )}
                    </Link>
                    {!personal && <Avatar id={person?.id ?? null} name={person?.name ?? null} size="sm" />}
                  </li>
                );
              })}
            </ul>
            <form action={addTask} className="mt-3 space-y-2">
              <input type="hidden" name="vendor_id" value={id} />
              <input type="hidden" name="event_id" value={event.id} />
              <input name="title" required placeholder="Ask about candles on every table" className="input" />
              {personal ? (
                <div className="flex justify-end">
                  <input type="hidden" name="assignee_id" value="me" />
                  <SubmitButton className="btn-ghost" pendingText="…">Add</SubmitButton>
                </div>
              ) : (
              <div className="flex gap-2">
                <select name="assignee_id" defaultValue="" className="input" aria-label="Assign to">
                  <option value="">Unassigned</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.id === user.id ? `${p.name} (me)` : p.name}</option>
                  ))}
                </select>
                <SubmitButton className="btn-ghost" pendingText="…">Add</SubmitButton>
              </div>
              )}
            </form>
          </section>
        </div>
      </div>

      {/* Details */}
      <details className="card group p-5">
        <summary className="cursor-pointer list-none">
          <span className="h-display text-xl">Edit details &amp; notes</span>
          <span className="ml-2 text-sm text-muted group-open:hidden">Contact info, contract total, general notes</span>
        </summary>
        <form action={updateVendor} className="mt-5 space-y-4">
          <input type="hidden" name="id" value={id} />
          <VendorFields v={vendor} full />
          <div>
            <label className="label" htmlFor="notes">General notes</label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={vendor.notes ?? ""}
              placeholder="Package details, what's included, things to remember…"
              className="input resize-y"
            />
          </div>
          <SubmitButton>Save changes</SubmitButton>
        </form>
        <form action={deleteVendor} className="mt-6 border-t border-line pt-4">
          <input type="hidden" name="id" value={id} />
          <ConfirmButton
            message={`Delete ${vendor.name}? Their conversation log and payments will be deleted too.`}
            className="text-sm text-muted hover:text-accent"
          >
            Delete this vendor and everything logged for them
          </ConfirmButton>
        </form>
      </details>
    </div>
  );
}

function Money({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="font-medium tabular-nums">{money(value)}</p>
    </div>
  );
}
