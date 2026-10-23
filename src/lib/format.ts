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

export const TICKET_STATUSES = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
] as const;

export const TICKET_PRIORITIES = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export function ticketStatusLabel(value: string) {
  return TICKET_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function priorityLabel(value: string) {
  return TICKET_PRIORITIES.find((s) => s.value === value)?.label ?? value;
}

export function timeAgo(iso: string) {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** "19:00:00" → "7:00 PM" */
export function formatTime(t: string | null | undefined) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Every 15 minutes of the day, for time dropdowns. Value is "HH:MM". */
export const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return { value, label: formatTime(value) };
});

/** "2027-09-04" → "Saturday, September 4, 2027" */
export function longDate(day: string | null | undefined) {
  if (!day) return "";
  return parseDay(day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
