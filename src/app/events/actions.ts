"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_EVENT_COOKIE, num, text } from "@/lib/event";

export async function createEvent(form: FormData) {
  const supabase = await createClient();
  const back = (msg: string) => redirect(`/events/new?error=${encodeURIComponent(msg)}`);

  // Either use an existing team, or create a new one first.
  let teamId = text(form, "team_id");
  if (!teamId || teamId === "new") {
    const teamName = text(form, "team_name") ?? back("Give your team a name");
    const { data, error } = await supabase.rpc("create_team", { p_name: teamName });
    if (error) back(error.message);
    teamId = String(data);
  }

  const { data, error } = await supabase.rpc("create_event", {
    p_team_id: teamId,
    p_name: text(form, "name") ?? "",
    p_event_type: text(form, "event_type") ?? "Other",
    p_event_date: text(form, "event_date"),
    p_location: text(form, "location"),
    p_total_budget: num(form, "total_budget") ?? 0,
  });
  if (error) back(error.message);

  (await cookies()).set(CURRENT_EVENT_COOKIE, String(data), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  redirect("/hq");
}
