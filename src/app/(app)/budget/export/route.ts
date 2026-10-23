import { requireEvent, teamPeople } from "@/lib/event";
import { loadExpenses } from "@/lib/expenses";

function cell(v: string | number | null | undefined) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Download every expense as a spreadsheet (opens in Excel, Numbers or Google Sheets). */
export async function GET() {
  const { supabase, event, user } = await requireEvent();
  const people = await teamPeople(supabase, event.team_id, user.id);
  const { rows } = await loadExpenses(supabase, event.id, people);

  const header = ["Date", "Expense", "Category", "Amount", "Paid by", "Method", "Vendor", "Type", "Notes"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.date, r.description, r.category, r.amount.toFixed(2), r.payer, r.method, r.vendorName, r.source === "payment" ? "Vendor payment" : "Expense", r.notes]
        .map(cell)
        .join(",")
    ),
  ];
  const safeName = event.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}-expenses.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
