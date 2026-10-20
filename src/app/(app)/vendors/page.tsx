import Link from "next/link";
import { requireEvent } from "@/lib/event";
import { money } from "@/lib/format";
import { Empty, PageHeader, StatusPill } from "@/components/page-header";
import { VendorFields } from "@/components/vendor-fields";
import { SubmitButton } from "@/components/submit-button";
import { addVendor } from "../actions";

const ORDER = ["booked", "contacted", "researching", "declined"];

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { supabase, event } = await requireEvent();

  const [{ data: vendorRows }, { data: paymentRows }, { data: noteRows }] = await Promise.all([
    supabase.from("vendors").select("id, name, category, status, contract_total, contact_name").eq("event_id", event.id).order("name"),
    supabase.from("payments").select("vendor_id, amount, paid").eq("event_id", event.id),
    q ? supabase.from("vendor_notes").select("vendor_id").eq("event_id", event.id).ilike("summary", `%${q}%`) : Promise.resolve({ data: [] }),
  ]);

  const paidBy = new Map<string, number>();
  for (const p of paymentRows ?? []) {
    if (p.paid && p.vendor_id) paidBy.set(p.vendor_id, (paidBy.get(p.vendor_id) ?? 0) + Number(p.amount));
  }

  // Search matches the vendor's name/type/contact, or anything said in their conversation log.
  const noteHits = new Set((noteRows ?? []).map((n: { vendor_id: string }) => n.vendor_id));
  const needle = q?.toLowerCase().trim();
  const vendors = (vendorRows ?? [])
    .filter(
      (v) =>
        !needle ||
        v.name.toLowerCase().includes(needle) ||
        v.category.toLowerCase().includes(needle) ||
        (v.contact_name ?? "").toLowerCase().includes(needle) ||
        noteHits.has(v.id)
    )
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Every vendor gets a home for contacts, payments and your conversation history."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <form className="mb-4">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search vendors and conversations… e.g. “candles”"
              className="input"
            />
          </form>

          {vendors.length === 0 ? (
            <Empty>
              {q ? `Nothing matches “${q}”.` : "No vendors yet. Add your first one to get started."}
            </Empty>
          ) : (
            <ul className="space-y-2">
              {vendors.map((v) => {
                const paid = paidBy.get(v.id) ?? 0;
                const total = Number(v.contract_total);
                return (
                  <li key={v.id}>
                    <Link
                      href={`/vendors/${v.id}`}
                      className="card flex items-center gap-4 p-4 transition hover:border-accent/40"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft font-display text-lg text-accent-dark">
                        {v.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{v.name}</p>
                          <StatusPill status={v.status} />
                        </div>
                        <p className="text-sm text-muted">
                          {v.category}
                          {v.contact_name ? ` · ${v.contact_name}` : ""}
                          {needle && noteHits.has(v.id) ? " · mentioned in a conversation" : ""}
                        </p>
                      </div>
                      {total > 0 && (
                        <div className="hidden text-right sm:block">
                          <p className="font-medium tabular-nums">{money(total)}</p>
                          <p className="text-xs text-muted">{money(paid)} paid</p>
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="card h-fit p-5">
          <h2 className="h-display text-xl">Add a vendor</h2>
          <form action={addVendor} className="mt-4 space-y-4">
            <VendorFields />
            <SubmitButton className="btn-primary w-full">Add vendor</SubmitButton>
          </form>
        </aside>
      </div>
    </div>
  );
}
