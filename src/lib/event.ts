export { initials } from "@/lib/format";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const CURRENT_EVENT_COOKIE = "itd_event";

export type EventRow = {
  id: string;
  team_id: string;
  name: string;
  event_type: string;
  event_date: string | null;
  location: string | null;
  total_budget: number;
  created_by: string;
};

export type Team = { id: string; name: string; invite_token: string; created_by: string };

export type Person = { id: string; name: string; email: string | null; role: string };

export type ViewMode = "personal" | "team";

/**
 * Returns the logged-in user, their teams and events, the event they're
 * currently working on, and that event's team.
 * Sends them to /login or /events/new if something is missing.
 */
export async function requireEvent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: eventRows }, { data: teamRows }, { data: profile }] = await Promise.all([
    supabase
      .from("events")
      .select("id, team_id, name, event_type, event_date, location, total_budget, created_by")
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase.from("teams").select("id, name, invite_token, created_by").order("created_at"),
    supabase.from("profiles").select("full_name, view_mode").eq("id", user.id).maybeSingle(),
  ]);

  const events = (eventRows ?? []) as EventRow[];
  const teams = (teamRows ?? []) as Team[];
  if (events.length === 0) redirect("/events/new");

  const chosen = (await cookies()).get(CURRENT_EVENT_COOKIE)?.value;
  const event = events.find((e) => e.id === chosen) ?? events[0];
  const team = teams.find((t) => t.id === event.team_id) ?? teams[0];

  const mode: ViewMode = profile?.view_mode === "personal" ? "personal" : "team";
  const fullName: string = profile?.full_name ?? "";

  return { supabase, user, events, event, teams, team, mode, fullName };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Everyone on a team, with their names, sorted with the current user first. */
export async function teamPeople(supabase: Supabase, teamId: string, meId: string): Promise<Person[]> {
  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, role, joined_at")
    .eq("team_id", teamId)
    .order("joined_at");
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const people = (members ?? []).map((m) => {
    const p = byId.get(m.user_id);
    return {
      id: m.user_id,
      name: p?.full_name || p?.email?.split("@")[0] || "Teammate",
      email: p?.email ?? null,
      role: m.role,
    };
  });
  return people.sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : 0));
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
