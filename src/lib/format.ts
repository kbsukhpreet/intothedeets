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

export const EVENT_TYPES = [
  "Wedding",
  "Engagement party",
  "Bridal or baby shower",
  "Birthday",
  "Anniversary",
  "Graduation",
  "Corporate event",
  "Conference",
  "Fundraiser or gala",
  "Holiday party",
  "Reunion",
  "Religious or cultural celebration",
  "Other",
] as const;

export const ACCOUNT_PURPOSES = [
  { value: "own_event", label: "I'm planning my own event" },
  { value: "helping", label: "I'm helping plan a friend's or family member's event" },
  { value: "planner", label: "I'm an event planner managing clients' events" },
  { value: "company", label: "I plan events for my company or organization" },
  { value: "vendor", label: "I'm a vendor or service provider" },
  { value: "exploring", label: "Just exploring" },
] as const;

export const VENDOR_CATEGORIES = [
  "Venue",
  "Catering",
  "Bar & Beverages",
  "Photography",
  "Videography",
  "Florist",
  "DJ / Music",
  "Entertainment",
  "Host / MC / Officiant",
  "Hair & Makeup",
  "Attire",
  "Cake & Desserts",
  "Planner / Coordinator",
  "Rentals",
  "Decor",
  "AV & Lighting",
  "Transportation",
  "Stationery & Printing",
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
