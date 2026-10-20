import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const CURRENT_EVENT_COOKIE = "itd_event";

export type EventRow = {
  id: string;
  name: string;
  event_type: string;
  event_date: string | null;
  location: string | null;
  total_budget: number;
  created_by: string;
};

/**
 * Returns the logged-in user, every event they belong to, and the event
 * they're currently working on. Sends them to /login or /events/new if needed.
 */
export async function requireEvent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("events")
    .select("id, name, event_type, event_date, location, total_budget, created_by")
    .order("event_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const events = (rows ?? []) as EventRow[];
  if (events.length === 0) redirect("/events/new");

  const chosen = (await cookies()).get(CURRENT_EVENT_COOKIE)?.value;
  const event = events.find((e) => e.id === chosen) ?? events[0];

  return { supabase, user, events, event };
}

// Small helpers for reading form fields in server actions.
export function text(form: FormData, key: string) {
  const v = form.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

export function num(form: FormData, key: string) {
  const s = text(form, key);
  if (!s) return null;
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}
