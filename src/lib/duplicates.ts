/*
 * Finds entries in the expenses list that are probably the same payment
 * logged twice (for example once as an expense and once as a vendor payment).
 *
 * Two entries are flagged when they have the SAME AMOUNT and at least one of:
 *   - they're linked to the same vendor
 *   - their descriptions share a distinctive word (e.g. "Venetian")
 *   - they're in the same category and dated within 14 days of each other
 * Entries someone marked "Not a duplicate" are skipped.
 */

export type DupInput = {
  key: string;
  amount: number;
  date: string | null;
  description: string;
  category: string;
  vendorId: string | null;
  vendorName: string | null;
  duplicateOk: boolean;
};

// Words too common to mean two entries are about the same thing.
const COMMON = new Set([
  "payment", "payments", "deposit", "downpayment", "down", "first", "second", "third", "final",
  "balance", "the", "and", "for", "from", "with", "fee", "fees", "paid", "pay", "installment",
  "1st", "2nd", "3rd", "4th", "remaining", "half", "full", "part", "partial", "total", "of",
]);

function words(s: string) {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !COMMON.has(w) && !/^\d+$/.test(w))
  );
}

function daysApart(a: string | null, b: string | null) {
  if (!a || !b) return Infinity;
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
}

export function findDuplicates(rows: DupInput[]) {
  const pairs: [string, string][] = [];
  const candidates = rows.filter((r) => !r.duplicateOk && r.amount > 0);
  const byAmount = new Map<string, DupInput[]>();
  for (const r of candidates) {
    const k = r.amount.toFixed(2);
    byAmount.set(k, [...(byAmount.get(k) ?? []), r]);
  }
  for (const group of byAmount.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const sameVendor = Boolean(a.vendorId && a.vendorId === b.vendorId);
        const wa = words(`${a.description} ${a.vendorName ?? ""}`);
        const wb = words(`${b.description} ${b.vendorName ?? ""}`);
        const sharedWord = [...wa].some((w) => wb.has(w));
        const sameCategorySoon = a.category === b.category && daysApart(a.date, b.date) <= 14;
        if (sameVendor || sharedWord || sameCategorySoon) pairs.push([a.key, b.key]);
      }
    }
  }
  const flagged = new Set(pairs.flat());
  return { pairs, flagged };
}
