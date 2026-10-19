import Link from "next/link";
import { requireWedding } from "@/lib/wedding";
import { addDaysISO, money, prettyDate, relativeDue, todayISO } from "@/lib/format";
import { Empty, PageHeader, StatusPill } from "@/components/page-header";
import { togglePayment } from "../actions";

type Payment = {
  id: string;
  label: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  paid_on: string | null;
  vendor_id: string | null;
};

export default async function BudgetPage() {
  const { supabase, wedding } = await requireWedding();
  const today = todayISO();
  const in90 = addDaysISO(90);

  const [{ data: vendorRows }, { data: paymentRows }] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, category, status, contract_total")
      .neq("status", "declined")
      .order("contract_total", { ascending: false }),
    supabase
      .from("payments")
      .select("id, label, amount, due_date, paid, paid_on, vendor_id")
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  const vendors = vendorRows ?? [];
  const payments = (paymentRows ?? []) as Payment[];
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));

  const paidBy = new Map<string, number>();
  for (const p of payments) {
    if (p.paid && p.vendor_id) paidBy.set(p.vendor_id, (paidBy.get(p.vendor_id) ?? 0) + Number(p.amount));
  }

  const budget = Number(wedding.total_budget);
  const committed = vendors.reduce((s, v) => s + Number(v.contract_total), 0);
  const paid = payments.filter((p) => p.paid).reduce((s, p) => s + Number(p.amount), 0);
  const owed = Math.max(committed - paid, 0);
  const unallocated = budget - committed;

  const unpaid = payments.filter((p) => !p.paid);
  const overdue = unpaid.filter((p) => p.due_date && p.due_date < today);
  const soon = unpaid.filter((p) => p.due_date && p.due_date >= today && p.due_date <= in90);
  const later = unpaid.filter((p) => !p.due_date || p.due_date > in90);
  const paidList = payments.filter((p) => p.paid);
  const due90Total = [...overdue, ...soon].reduce((s, p) => s + Number(p.amount), 0);

  const pct = budget > 0 ? Math.min((committed / budget) * 100, 100) : 0;
  const paidPct = budget > 0 ? Math.min((paid / budget) * 100, 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Budget & payments" subtitle="What you've committed, what you've paid, and what's coming up." />

      {due90Total > 0 && (
        <div className="rounded-2xl bg-amber-soft px-5 py-4 text-amber">
          <p className="h-display text-xl text-ink">
            You have {money(due90Total)} in vendor payments due over the next 90 days.
          </p>
          {overdue.length > 0 && (
            <p className="mt-1 text-sm">
              {overdue.length} of those {overdue.length === 1 ? "is" : "are"} already past due.
            </p>
          )}
        </div>
      )}

      <section className="card p-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Figure label="Total budget" value={budget > 0 ? money(budget) : "Not set"} />
          <Figure label="Committed" value={money(committed)} />
          <Figure label="Paid so far" value={money(paid)} />
          <Figure
            label={unallocated >= 0 ? "Left to allocate" : "Over budget"}
            value={money(Math.abs(unallocated))}
            warn={unallocated < 0}
          />
        </div>
        {budget > 0 && (
          <div className="mt-6">
            <div className="relative h-3 overflow-hidden rounded-full bg-paper">
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent/30" style={{ width: `${pct}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${paidPct}%` }} />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-accent" /> Paid</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-accent/30" /> Committed</span>
              <span className="ml-auto">{money(owed)} still owed to vendors</span>
            </div>
          </div>
        )}
        {budget === 0 && (
          <p className="mt-4 text-sm text-muted">
            <Link href="/settings" className="btn-link">Set your total budget</Link> to see how much is left.
          </p>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="h-display px-5 pt-5 text-2xl">By vendor</h2>
        {vendors.length === 0 ? (
          <div className="p-5"><Empty>Add vendors with their contract totals to see them here.</Empty></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3 w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-2 font-medium">Vendor</th>
                  <th className="px-3 py-2 text-right font-medium">Contract</th>
                  <th className="px-3 py-2 text-right font-medium">Paid</th>
                  <th className="px-5 py-2 text-right font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {vendors.map((v) => {
                  const total = Number(v.contract_total);
                  const p = paidBy.get(v.id) ?? 0;
                  return (
                    <tr key={v.id} className="hover:bg-paper/60">
                      <td className="px-5 py-3">
                        <Link href={`/vendors/${v.id}`} className="font-medium hover:text-accent">{v.name}</Link>
                        <span className="ml-2 text-muted">{v.category}</span>
                        {v.status !== "booked" && <span className="ml-2"><StatusPill status={v.status} /></span>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(total)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-sage">{money(p)}</td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums">{money(Math.max(total - p, 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line font-medium">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(committed)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-sage">{money(paid)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{money(owed)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="h-display text-2xl">Payment timeline</h2>
        {payments.length === 0 && (
          <Empty>Open a vendor and add their deposit and payment schedule. They&apos;ll all show up here.</Empty>
        )}
        <PaymentGroup title="Past due" items={overdue} names={vendorName} today={today} tone="warn" />
        <PaymentGroup title="Next 90 days" items={soon} names={vendorName} today={today} />
        <PaymentGroup title="Later" items={later} names={vendorName} today={today} />
        <PaymentGroup title="Paid" items={paidList} names={vendorName} today={today} />
      </section>
    </div>
  );
}

function Figure({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`h-display mt-1 text-2xl tabular-nums sm:text-3xl ${warn ? "text-amber" : ""}`}>{value}</p>
    </div>
  );
}

function PaymentGroup({
  title,
  items,
  names,
  today,
  tone,
}: {
  title: string;
  items: Payment[];
  names: Map<string, string>;
  today: string;
  tone?: "warn";
}) {
  if (items.length === 0) return null;
  const total = items.reduce((s, p) => s + Number(p.amount), 0);
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <h3 className={`font-medium ${tone === "warn" ? "text-amber" : ""}`}>{title}</h3>
        <span className="text-sm tabular-nums text-muted">{money(total)}</span>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {items.map((p) => (
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
              <p className="truncate text-sm font-medium">
                {p.vendor_id ? (
                  <Link href={`/vendors/${p.vendor_id}`} className="hover:text-accent">{names.get(p.vendor_id) ?? "Vendor"}</Link>
                ) : null}
                <span className={p.vendor_id ? "font-normal text-muted" : ""}>{p.vendor_id ? ` · ${p.label}` : p.label}</span>
              </p>
              <p className="text-xs text-muted">
                {p.paid
                  ? `Paid${p.paid_on ? ` ${prettyDate(p.paid_on, true)}` : ""}`
                  : p.due_date
                    ? <span className={p.due_date < today ? "text-amber" : ""}>{relativeDue(p.due_date)} · {prettyDate(p.due_date, true)}</span>
                    : "No due date"}
              </p>
            </div>
            <span className="text-sm font-medium tabular-nums">{money(p.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
