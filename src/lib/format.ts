export function money(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

// Dates are stored as plain "YYYY-MM-DD" strings. Parse them as local dates
// so a date never shifts by a day because of time zones.
export function parseDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(days: number) {
  const dt = new Date();
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysUntil(day: string) {
  const target = parseDay(day).getTime();
  const t = new Date();
  const today = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function prettyDate(day: string | null | undefined, withYear = false) {
  if (!day) return "";
  return parseDay(day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function relativeDue(day: string) {
  const n = daysUntil(day);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  if (n < 0) return `${-n} days overdue`;
  if (n <= 14) return `In ${n} days`;
  return prettyDate(day);
}

export const VENDOR_CATEGORIES = [
  "Venue",
  "Caterer",
  "Photographer",
  "Videographer",
  "Florist",
  "DJ / Band",
  "Officiant",
  "Hair & Makeup",
  "Attire",
  "Cake & Desserts",
  "Planner",
  "Rentals",
  "Decor",
  "Transportation",
  "Stationery",
  "Other",
] as const;

export const VENDOR_STATUSES = [
  { value: "researching", label: "Researching" },
  { value: "contacted", label: "In talks" },
  { value: "booked", label: "Booked" },
  { value: "declined", label: "Passed" },
] as const;

export const NOTE_CHANNELS = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "text", label: "Text" },
  { value: "other", label: "Other" },
] as const;

export function statusLabel(value: string) {
  return VENDOR_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function channelLabel(value: string) {
  return NOTE_CHANNELS.find((s) => s.value === value)?.label ?? value;
}
