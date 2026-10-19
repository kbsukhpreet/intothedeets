import { VENDOR_CATEGORIES, VENDOR_STATUSES } from "@/lib/format";

type VendorDefaults = {
  name?: string | null;
  category?: string | null;
  status?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  contract_total?: number | null;
};

export function VendorFields({ v = {}, full = false }: { v?: VendorDefaults; full?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="name">Business name</label>
        <input id="name" name="name" required defaultValue={v.name ?? ""} placeholder="Bloom & Stem Florals" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="category">Type</label>
        <select id="category" name="category" defaultValue={v.category ?? "Venue"} className="input">
          {VENDOR_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={v.status ?? "researching"} className="input">
          {VENDOR_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="contact_name">Contact person</label>
        <input id="contact_name" name="contact_name" defaultValue={v.contact_name ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="contract_total">Contract total</label>
        <input
          id="contract_total"
          name="contract_total"
          inputMode="decimal"
          defaultValue={v.contract_total ? Number(v.contract_total) : ""}
          placeholder="$0"
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" defaultValue={v.email ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone</label>
        <input id="phone" name="phone" type="tel" defaultValue={v.phone ?? ""} className="input" />
      </div>
      {full && (
        <div className="sm:col-span-2">
          <label className="label" htmlFor="website">Website or Instagram</label>
          <input id="website" name="website" defaultValue={v.website ?? ""} className="input" />
        </div>
      )}
    </div>
  );
}
