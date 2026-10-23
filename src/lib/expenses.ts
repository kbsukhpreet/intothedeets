import type { Person } from "@/lib/event";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** One line in the Expenses table: either a hand-entered expense or a vendor payment marked paid. */
export type ExpenseRow = {
  key: string; // "e:<id>" or "p:<id>"
  source: "expense" | "payment";
  id: string;
  date: string | null;
  description: string;
  category: string;
  amount: number;
  payerKey: string; // "user:<id>", "name:<text>" or "" — used for filtering
  payer: string; // what to show
  method: string | null;
  vendorId: string | null;
  vendorName: string | null;
  notes: string | null;
};

export async function loadExpenses(supabase: Supabase, eventId: string, people: Person[]) {
  const [{ data: exp }, { data: pay }, { data: vendors }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, spent_on, description, category, amount, paid_by_user_id, paid_by_name, method, vendor_id, notes")
      .eq("event_id", eventId),
    supabase
      .from("payments")
      .select("id, label, amount, paid, paid_on, due_date, vendor_id, paid_by_user_id, paid_by_name, method")
      .eq("event_id", eventId)
      .eq("paid", true),
    supabase.from("vendors").select("id, name, category").eq("event_id", eventId),
  ]);

  const personName = new Map(people.map((p) => [p.id, p.name]));
  const vendor = new Map((vendors ?? []).map((v) => [v.id, v]));
  const payer = (userId: string | null, name: string | null) =>
    userId
      ? { payerKey: `user:${userId}`, payer: personName.get(userId) ?? "Former teammate" }
      : name
        ? { payerKey: `name:${name}`, payer: name }
        : { payerKey: "", payer: "Not recorded" };

  const rows: ExpenseRow[] = [
    ...(exp ?? []).map((e) => ({
      key: `e:${e.id}`,
      source: "expense" as const,
      id: e.id,
      date: e.spent_on,
      description: e.description,
      category: e.category,
      amount: Number(e.amount),
      ...payer(e.paid_by_user_id, e.paid_by_name),
      method: e.method,
      vendorId: e.vendor_id,
      vendorName: e.vendor_id ? vendor.get(e.vendor_id)?.name ?? null : null,
      notes: e.notes,
    })),
    ...(pay ?? []).map((p) => {
      const v = p.vendor_id ? vendor.get(p.vendor_id) : null;
      return {
        key: `p:${p.id}`,
        source: "payment" as const,
        id: p.id,
        date: p.paid_on ?? p.due_date,
        description: v ? `${v.name} · ${p.label}` : p.label,
        category: v?.category ?? "Other",
        amount: Number(p.amount),
        ...payer(p.paid_by_user_id, p.paid_by_name),
        method: p.method,
        vendorId: p.vendor_id,
        vendorName: v?.name ?? null,
        notes: null,
      };
    }),
  ];

  rows.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const typedNames = [...new Set((exp ?? []).map((e) => e.paid_by_name).concat((pay ?? []).map((p) => p.paid_by_name)).filter(Boolean))] as string[];
  return { rows, typedNames };
}
