import Link from "next/link";
import { requireEvent, teamPeople } from "@/lib/event";
import { loadExpenses, type ExpenseRow } from "@/lib/expenses";
import {
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  addDaysISO,
  money,
  prettyDate,
  relativeDue,
  todayISO,
} from "@/lib/format";
import { Empty, PageHeader, StatusPill } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { ConfirmButton } from "@/components/confirm-button";
import { DatePicker } from "@/components/date-picker";
import { FilterSelect } from "@/components/auto-submit-select";
import { PaidByField } from "@/components/paid-by-field";
import { addExpense, deleteExpense, togglePayment, updateExpense, updatePaymentDetails } from "../actions";

type Payment = {
  id: string;
  label: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  paid_on: string | null;
  vendor_id: string | null;
};

type Tab = "overview" | "expenses" | "schedule";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; who?: string; cat?: string; edit?: string; add?: string; added?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = params.tab === "expenses" ? "expenses" : params.tab === "schedule" ? "schedule" : "overview";
  const { supabase, event, user } = await requireEvent();
  const today = todayISO();
  const in90 = addDaysISO(90);

  const [{ data: vendorRows }, { data: paymentRows }, people] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, category, status, contract_total")
      .eq("event_id", event.id)
      .neq("status", "declined")
      .order("contract_total", { ascending: false }),
    supabase
      .from("payments")
      .select("id, label, amount, due_date, paid, paid_on, vendor_id")
      .eq("event_id", event.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    teamPeople(supabase, event.team_id, user.id),
  ]);
  const { rows: expenses, typedNames } = await loadExpenses(supabase, event.id, people);

  const vendors = vendorRows ?? [];
  const payments = (paymentRows ?? []) as Payment[];
  const vendorName = new Map(vendors.map((v) => [v.id, v.name]));
  const manual = expenses.filter((e) => e.source === "expense");

  // Money math (see README): manual expenses tied to a vendor count toward that vendor;
  // everything else adds on top of vendor contracts.
  const paidToVendor = new Map<string, number>();
  for (const p of payments) if (p.paid && p.vendor_id) paidToVendor.set(p.vendor_id, (paidToVendor.get(p.vendor_id) ?? 0) + Number(p.amount));
  for (const e of manual) if (e.vendorId) paidToVendor.set(e.vendorId, (paidToVendor.get(e.vendorId) ?? 0) + e.amount);

  const budget = Number(event.total_budget);
  const contracts = vendors.reduce((s, v) => s + Number(v.contract_total), 0);
  const extras = manual.filter((e) => !e.vendorId).reduce((s, e) => s + e.amount, 0);
  const committed = contracts + extras;
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  const owed = vendors.reduce((s, v) => s + Math.max(Number(v.contract_total) - (paidToVendor.get(v.id) ?? 0), 0), 0);
  const left = budget - committed;

  const unpaid = payments.filter((p) => !p.paid);
  const overdue = unpaid.filter((p) => p.due_date && p.due_date < today);
  const soon = unpaid.filter((p) => p.due_date && p.due_date >= today && p.due_date <= in90);
  const later = unpaid.filter((p) => !p.due_date || p.due_date > in90);
  const paidList = payments.filter((p) => p.paid);
  const due90Total = [...overdue, ...soon].reduce((s, p) => s + Number(p.amount), 0);

  const tabHref = (t: Tab) => (t === "overview" ? "/budget" : `/budget?tab=${t}`);

  return (
    <div className="space-y-6">
      <PageHeader title="Budget & Expenses" subtitle="What you've planned, what you've spent, and what's coming up." />

      {/* Tabs */}
      <nav className="flex w-fit rounded-xl border border-line bg-white p-1 text-sm" aria-label="Budget sections">
        {(
          [
            ["overview", "Overview"],
            ["expenses", `Expenses${expenses.length ? ` · ${expenses.length}` : ""}`],
            ["schedule", "Payment schedule"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <Link
            key={t}
            href={tabHref(t)}
            className={`rounded-lg px-3.5 py-1.5 font-medium transition sm:px-4 ${
              tab === t ? "bg-accent text-white" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab !== "expenses" && due90Total > 0 && (
        <div className="rounded-2xl bg-amber-soft px-5 py-4 text-amber">
          <p className="h-display text-lg text-ink sm:text-xl">
            {money(due90Total)} in vendor payments due over the next 90 days.
          </p>
          {overdue.length > 0 && (
            <p className="mt-0.5 text-sm">
              {overdue.length} {overdue.length === 1 ? "is" : "are"} already past due.{" "}
              {tab === "overview" && <Link href="/budget?tab=schedule" className="underline">See schedule</Link>}
            </p>
          )}
        </div>
      )}

      {tab === "overview" && (
        <Overview
          budget={budget}
          committed={committed}
          spent={spent}
          owed={owed}
          left={left}
          vendors={vendors}
          paidToVendor={paidToVendor}
          expenses={expenses}
        />
      )}

      {tab === "expenses" && (
        <Expenses
          params={params}
          rows={expenses}
          people={people}
          typedNames={typedNames}
          vendors={vendors}
          meId={user.id}
          spent={spent}
        />
      )}

      {tab === "schedule" && (
        <section className="space-y-4">
          {payments.length === 0 && (
            <Empty>Open a vendor and add their deposit and payment schedule. They&apos;ll all show up here.</Empty>
          )}
          <PaymentGroup title="Past due" items={overdue} names={vendorName} today={today} tone="warn" />
          <PaymentGroup title="Next 90 days" items={soon} names={vendorName} today={today} />
          <PaymentGroup title="Later" items={later} names={vendorName} today={today} />
          <PaymentGroup title="Paid" items={paidList} names={vendorName} today={today} />
          {paidList.length > 0 && (
            <p className="text-xs text-muted">
              Paid vendor payments also appear under <Link href="/budget?tab=expenses" className="btn-link text-xs">Expenses</Link>,
              where you can record who paid and how.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/* ─────────────────────────── Overview ─────────────────────────── */

function Overview({
  budget,
  committed,
  spent,
  owed,
  left,
  vendors,
  paidToVendor,
  expenses,
}: {
  budget: number;
  committed: number;
  spent: number;
  owed: number;
  left: number;
  vendors: { id: string; name: string; category: string; status: string; contract_total: number }[];
  paidToVendor: Map<string, number>;
  expenses: ExpenseRow[];
}) {
  const pct = budget > 0 ? Math.min((committed / budget) * 100, 100) : 0;
  const spentPct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  const sumBy = (key: (e: ExpenseRow) => string) => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(key(e), (m.get(key(e)) ?? 0) + e.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const byPerson = sumBy((e) => e.payer);
  const byCategory = sumBy((e) => e.category);

  return (
    <>
      <section className="card p-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Figure label="Total budget" value={budget > 0 ? money(budget) : "Not set"} />
          <Figure label="Committed" value={money(committed)} />
          <Figure label="Spent so far" value={money(spent)} />
          <Figure label={left >= 0 ? "Left in budget" : "Over budget"} value={money(Math.abs(left))} warn={left < 0} />
        </div>
        {budget > 0 ? (
          <div className="mt-6">
            <div className="relative h-3 overflow-hidden rounded-full bg-paper">
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent/30" style={{ width: `${pct}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${spentPct}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-accent" /> Spent</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-accent/30" /> Committed</span>
              <span className="ml-auto">{money(owed)} still owed to vendors</span>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            <Link href="/settings" className="btn-link">Set your total budget</Link> to see how much is left.
          </p>
        )}
      </section>

      {expenses.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Breakdown title="Spent by person" rows={byPerson} total={spent} />
          <Breakdown title="Spent by category" rows={byCategory} total={spent} />
        </div>
      )}

      <section className="card overflow-hidden">
        <h2 className="h-display px-5 pt-5 text-xl">By vendor</h2>
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
                  const p = paidToVendor.get(v.id) ?? 0;
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
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Breakdown({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  const top = rows.slice(0, 6);
  const rest = rows.slice(6).reduce((s, [, n]) => s + n, 0);
  const list = rest > 0 ? [...top, ["Everything else", rest] as [string, number]] : top;
  return (
    <section className="card p-5">
      <h2 className="h-display text-xl">{title}</h2>
      <ul className="mt-4 space-y-3">
        {list.map(([name, amount]) => (
          <li key={name}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className={`truncate ${name === "Not recorded" ? "text-muted" : ""}`}>{name}</span>
              <span className="tabular-nums">{money(amount)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper">
              <div className="h-full rounded-full bg-accent/70" style={{ width: `${total ? (amount / total) * 100 : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─────────────────────────── Expenses ─────────────────────────── */

function Expenses({
  params,
  rows,
  people,
  typedNames,
  vendors,
  meId,
  spent,
}: {
  params: { who?: string; cat?: string; edit?: string; add?: string; added?: string };
  rows: ExpenseRow[];
  people: { id: string; name: string }[];
  typedNames: string[];
  vendors: { id: string; name: string }[];
  meId: string;
  spent: number;
}) {
  const shown = rows.filter((r) => (!params.who || r.payerKey === (params.who === "none" ? "" : params.who)) && (!params.cat || r.category === params.cat));
  const shownTotal = shown.reduce((s, r) => s + r.amount, 0);
  const editing = params.edit ? rows.find((r) => r.key === params.edit) : undefined;

  const payerOptions = [
    { value: "all", label: "Everyone" },
    ...[...new Map(rows.map((r) => [r.payerKey || "none", r.payer])).entries()].map(([value, label]) => ({ value, label })),
  ];
  const categoryOptions = [
    { value: "all", label: "All categories" },
    ...[...new Set(rows.map((r) => r.category))].sort().map((c) => ({ value: c, label: c })),
  ];

  return (
    <section className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {!editing && (
          <Link href={params.add ? "/budget?tab=expenses" : "/budget?tab=expenses&add=1"} className="btn-primary">
            {params.add ? "Close" : "+ Add expense"}
          </Link>
        )}
        {rows.length > 0 && (
          <>
            <FilterSelect param="who" value={params.who ?? "all"} options={payerOptions} ariaLabel="Filter by paid by" className="input w-auto py-1.5 text-sm" />
            <FilterSelect param="cat" value={params.cat ?? "all"} options={categoryOptions} ariaLabel="Filter by category" className="input w-auto py-1.5 text-sm" />
            <a href="/budget/export" className="ml-auto text-sm text-muted hover:text-accent" download>
              Download spreadsheet (CSV)
            </a>
          </>
        )}
      </div>

      {params.added && !params.add && (
        <p className="rounded-lg bg-sage-soft px-3 py-2 text-sm text-sage">Expense added.</p>
      )}

      {/* Add / edit form */}
      {(params.add || editing) && (
        <ExpenseForm
          key={editing?.key ?? "new"}
          row={editing}
          people={people}
          typedNames={typedNames}
          vendors={vendors}
          meId={meId}
        />
      )}

      {/* Table */}
      {rows.length === 0 ? (
        !params.add && (
          <Empty>
            No expenses yet. Add anything you&apos;ve spent, like decor, outfits or gifts. Vendor payments you mark as
            paid show up here automatically.
          </Empty>
        )
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">What</th>
                <th className="px-3 py-2.5 font-medium">Category</th>
                <th className="px-3 py-2.5 font-medium">Paid by</th>
                <th className="px-3 py-2.5 font-medium">Method</th>
                <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((r) => (
                <tr key={r.key} className={`hover:bg-paper/60 ${editing?.key === r.key ? "bg-accent-soft/40" : ""}`}>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted">{r.date ? prettyDate(r.date, true) : "—"}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{r.description}</span>
                    {r.source === "payment" && (
                      <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-[11px] text-muted">Vendor payment</span>
                    )}
                    {r.notes && <span className="block text-xs text-muted">{r.notes}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted">{r.category}</td>
                  <td className={`px-3 py-2.5 ${r.payerKey ? "" : "text-muted/70"}`}>{r.payer}</td>
                  <td className="px-3 py-2.5 text-muted">{r.method ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">{money(r.amount)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <Link href={`/budget?tab=expenses&edit=${r.key}`} className="text-xs text-muted hover:text-accent">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line">
                <td colSpan={5} className="px-4 py-3 text-sm text-muted">
                  {shown.length === rows.length ? `${rows.length} expenses` : `${shown.length} of ${rows.length} expenses shown`}
                </td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(shownTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {rows.length > 0 && shown.length !== rows.length && (
        <p className="text-xs text-muted">Total spent across everything: {money(spent)}</p>
      )}
    </section>
  );
}

function ExpenseForm({
  row,
  people,
  typedNames,
  vendors,
  meId,
}: {
  row?: ExpenseRow;
  people: { id: string; name: string }[];
  typedNames: string[];
  vendors: { id: string; name: string }[];
  meId: string;
}) {
  const isPayment = row?.source === "payment";
  const action = !row ? addExpense : isPayment ? updatePaymentDetails : updateExpense;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="h-display text-xl">{!row ? "Add an expense" : isPayment ? "Payment details" : "Edit expense"}</h2>
        {row && <Link href="/budget?tab=expenses" className="text-sm text-muted hover:text-ink">Cancel</Link>}
      </div>
      {isPayment && (
        <p className="mb-4 rounded-lg bg-paper px-3 py-2 text-sm text-muted">
          <strong className="font-medium text-ink">{row!.description}</strong> · {money(row!.amount)}. The amount is
          managed on the{" "}
          {row!.vendorId ? <Link href={`/vendors/${row!.vendorId}`} className="btn-link">vendor&apos;s page</Link> : "vendor's page"}
          . Here you can record who paid, when and how.
        </p>
      )}
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        {row && <input type="hidden" name="id" value={row.id} />}
        {!isPayment && (
          <>
            <input
              name="description"
              required
              defaultValue={row?.description ?? ""}
              placeholder="What was it for? e.g. Table centerpieces from Amazon"
              className="input sm:col-span-2"
            />
            <input
              name="amount"
              required
              inputMode="decimal"
              defaultValue={row ? row.amount : ""}
              placeholder="$ Amount"
              className="input"
            />
            <select name="category" defaultValue={row?.category ?? ""} required className="input select-placeholder">
              <option value="" disabled>Category</option>
              {[...new Set([...(row ? [row.category] : []), ...EXPENSE_CATEGORIES])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </>
        )}
        <DatePicker name="spent_on" defaultValue={row?.date ?? todayISO()} placeholder="Date paid" prefix="Paid " short />
        <PaidByField people={people} typedNames={typedNames} defaultValue={row?.payerKey ?? `user:${meId}`} meId={meId} />
        <select name="method" defaultValue={row?.method ?? ""} className="input select-placeholder">
          <option value="">Payment method</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        {!isPayment && (
          <>
            <select name="vendor_id" defaultValue={row?.vendorId ?? ""} className="input select-placeholder">
              <option value="">Vendor (optional)</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <input name="notes" defaultValue={row?.notes ?? ""} placeholder="Notes (optional)" className="input sm:col-span-2" />
          </>
        )}
        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <SubmitButton>{!row ? "Add expense" : "Save"}</SubmitButton>
        </div>
      </form>
      {row && !isPayment && (
        <form action={deleteExpense} className="mt-3 border-t border-line pt-3">
          <input type="hidden" name="id" value={row.id} />
          <ConfirmButton message={`Delete "${row.description}"?`} className="text-xs font-medium text-[#b3261e] hover:underline">
            Delete expense
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}

/* ─────────────────────────── Shared bits ─────────────────────────── */

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
