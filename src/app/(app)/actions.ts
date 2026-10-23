"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notifyAssigned } from "@/lib/email";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { CURRENT_EVENT_COOKIE, num, requireEvent, text } from "@/lib/event";
import { todayISO } from "@/lib/format";

function refresh() {
  revalidatePath("/", "layout");
}

function fail(message: string): never {
  throw new Error(message);
}

// ── Vendors ──────────────────────────────────────────────────

export async function addVendor(form: FormData) {
  const { supabase, event } = await requireEvent();
  const name = text(form, "name") ?? fail("Vendor name is required");

  const { data, error } = await supabase
    .from("vendors")
    .insert({
      event_id: event.id,
      name,
      category: text(form, "category") ?? "Other",
      status: text(form, "status") ?? "researching",
      contact_name: text(form, "contact_name"),
      email: text(form, "email"),
      phone: text(form, "phone"),
      contract_total: num(form, "contract_total") ?? 0,
    })
    .select("id")
    .single();
  if (error) fail(error.message);

  refresh();
  redirect(`/vendors/${data!.id}`);
}

export async function updateVendor(form: FormData) {
  const { supabase } = await requireEvent();
  const id = text(form, "id") ?? fail("Missing vendor");

  const { error } = await supabase
    .from("vendors")
    .update({
      name: text(form, "name") ?? fail("Vendor name is required"),
      category: text(form, "category") ?? "Other",
      status: text(form, "status") ?? "researching",
      contact_name: text(form, "contact_name"),
      email: text(form, "email"),
      phone: text(form, "phone"),
      website: text(form, "website"),
      contract_total: num(form, "contract_total") ?? 0,
      notes: text(form, "notes"),
    })
    .eq("id", id);
  if (error) fail(error.message);

  refresh();
}

export async function deleteVendor(form: FormData) {
  const { supabase } = await requireEvent();
  const id = text(form, "id") ?? fail("Missing vendor");
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) fail(error.message);
  refresh();
  redirect("/vendors");
}

// ── Conversation log ─────────────────────────────────────────

export async function addVendorNote(form: FormData) {
  const { supabase, event, user } = await requireEvent();
  const { error } = await supabase.from("vendor_notes").insert({
    event_id: event.id,
    vendor_id: text(form, "vendor_id") ?? fail("Missing vendor"),
    summary: text(form, "summary") ?? fail("Write a quick summary"),
    channel: text(form, "channel") ?? "other",
    note_date: text(form, "note_date") ?? todayISO(),
    created_by: user.id,
  });
  if (error) fail(error.message);
  refresh();
}

export async function deleteVendorNote(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase
    .from("vendor_notes")
    .delete()
    .eq("id", text(form, "id") ?? fail("Missing note"));
  if (error) fail(error.message);
  refresh();
}

// ── Payments ─────────────────────────────────────────────────

export async function addPayment(form: FormData) {
  const { supabase, event, user } = await requireEvent();
  const paid = form.get("paid") === "on";
  const date = text(form, "due_date");
  const row = {
    event_id: event.id,
    vendor_id: text(form, "vendor_id"),
    label: text(form, "label") ?? "Payment",
    amount: num(form, "amount") ?? fail("Enter an amount"),
    due_date: date,
    paid,
    // If it's already paid, the date entered is when it was paid (today if left blank).
    paid_on: paid ? date ?? todayISO() : null,
  };
  // Record who paid (the person ticking it off). Falls back gracefully if upgrade 8 isn't run yet.
  const payer = text(form, "paid_by") ? payerFields(form) : { paid_by_user_id: user.id };
  let { error } = await supabase.from("payments").insert(paid ? { ...row, ...payer } : row);
  if (error && /paid_by_user_id/.test(error.message)) ({ error } = await supabase.from("payments").insert(row));
  if (error) fail(error.message);
  refresh();

  // Heads-up if this looks like something already in Expenses.
  if (paid && row.vendor_id) {
    const { data: same } = await supabase
      .from("expenses")
      .select("id")
      .eq("event_id", event.id)
      .eq("amount", row.amount)
      .limit(1);
    if (same && same.length) redirect(`/vendors/${row.vendor_id}?possible_dup=1`);
  }
}

export async function togglePayment(form: FormData) {
  const { supabase, user } = await requireEvent();
  const id = text(form, "id") ?? fail("Missing payment");
  const paid = form.get("paid") === "true";
  const base: { paid: boolean; paid_on: string | null } = { paid, paid_on: paid ? todayISO() : null };

  // When ticking a payment off, assume the person ticking it paid, unless someone is already recorded.
  let extra: Record<string, string> = {};
  if (paid) {
    const { data: current, error: readErr } = await supabase
      .from("payments")
      .select("paid_by_user_id, paid_by_name")
      .eq("id", id)
      .maybeSingle();
    if (!readErr && current && !current.paid_by_user_id && !current.paid_by_name) extra = { paid_by_user_id: user.id };

    // Ticking off a payment that was due on a past date: assume it was paid on its due date.
    const { data: due } = await supabase.from("payments").select("due_date").eq("id", id).maybeSingle();
    if (due?.due_date && due.due_date <= todayISO()) base.paid_on = due.due_date;
  }
  const { error } = await supabase.from("payments").update({ ...base, ...extra }).eq("id", id);
  if (error) fail(error.message);
  refresh();
}

export async function deletePayment(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", text(form, "id") ?? fail("Missing payment"));
  if (error) fail(error.message);
  refresh();
}

// ── Tickets ──────────────────────────────────────────────────

const STATUSES = ["todo", "in_progress", "blocked", "done"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

function pick(value: string | null, allowed: string[], fallback: string) {
  return value && allowed.includes(value) ? value : fallback;
}

export async function addTask(form: FormData) {
  const { supabase, event, user } = await requireEvent();
  const assignee = text(form, "assignee_id");
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      event_id: text(form, "event_id") ?? event.id,
      title: text(form, "title") ?? fail("Give the ticket a title"),
      due_date: text(form, "due_date"),
      vendor_id: text(form, "vendor_id"),
      notes: text(form, "notes"),
      priority: pick(text(form, "priority"), PRIORITIES, "medium"),
      status: pick(text(form, "status"), STATUSES, "todo"),
      assignee_id: assignee === "me" ? user.id : assignee,
      is_private: form.get("is_private") === "on",
      created_by: user.id,
    })
    .select("id, assignee_id")
    .single();
  if (error) fail(error.message);
  const created = data!;
  after(() => notifyAssigned(created.id, created.assignee_id, user.id));
  refresh();
  if (text(form, "open_after") === "1") redirect(`/tickets/${created.id}`);
}

export async function toggleTask(form: FormData) {
  const { supabase } = await requireEvent();
  const done = form.get("done") === "true";
  const { error } = await supabase
    .from("tasks")
    .update({ status: done ? "done" : "todo" })
    .eq("id", text(form, "id") ?? fail("Missing ticket"));
  if (error) fail(error.message);
  refresh();
}

export async function setTicketStatus(form: FormData) {
  const { supabase } = await requireEvent();
  const status = pick(text(form, "status"), STATUSES, "todo");
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", text(form, "id") ?? fail("Missing ticket"));
  if (error) fail(error.message);
  refresh();
}

export async function setTicketAssignee(form: FormData) {
  const { supabase, user } = await requireEvent();
  const id = text(form, "id") ?? fail("Missing ticket");
  const assignee = text(form, "assignee_id");
  const { data: before } = await supabase.from("tasks").select("assignee_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("tasks").update({ assignee_id: assignee }).eq("id", id);
  if (error) fail(error.message);
  if (assignee && assignee !== before?.assignee_id) after(() => notifyAssigned(id, assignee, user.id));
  refresh();
}

export async function updateTicket(form: FormData) {
  const { supabase, user } = await requireEvent();
  const id = text(form, "id") ?? fail("Missing ticket");
  const assignee = text(form, "assignee_id");
  const { data: before } = await supabase.from("tasks").select("assignee_id").eq("id", id).maybeSingle();
  const { error } = await supabase
    .from("tasks")
    .update({
      title: text(form, "title") ?? fail("Give the ticket a title"),
      notes: text(form, "notes"),
      status: pick(text(form, "status"), STATUSES, "todo"),
      priority: pick(text(form, "priority"), PRIORITIES, "medium"),
      assignee_id: assignee,
      due_date: text(form, "due_date"),
      vendor_id: text(form, "vendor_id"),
      // Only change privacy when the form actually shows the Private switch.
      ...(form.get("has_private") === "1" ? { is_private: form.get("is_private") === "on" } : {}),
    })
    .eq("id", id);
  if (error) fail(error.message);
  if (assignee && assignee !== before?.assignee_id) after(() => notifyAssigned(id, assignee, user.id));
  refresh();
}

export async function deleteTask(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", text(form, "id") ?? fail("Missing ticket"));
  if (error) fail(error.message);
  refresh();
  const back = text(form, "back");
  if (back?.startsWith("/")) redirect(back);
}

export async function addComment(form: FormData) {
  const { supabase, user } = await requireEvent();
  const taskId = text(form, "task_id") ?? fail("Missing ticket");
  const { data: task } = await supabase.from("tasks").select("event_id, assignee_id").eq("id", taskId).single();
  if (!task) fail("Ticket not found");
  const body = text(form, "body") ?? fail("Write a comment first");
  const { error } = await supabase.from("ticket_comments").insert({
    task_id: taskId,
    event_id: task.event_id,
    author_id: user.id,
    body,
  });
  if (error) fail(error.message);
  // Comment emails are paused to stay within the email plan; they'll return
  // as push notifications in the phone app (see notifyComment in lib/email.ts).

  // Posting an update can also move the ticket along.
  const status = text(form, "status");
  if (status && STATUSES.includes(status)) {
    await supabase.from("tasks").update({ status }).eq("id", taskId);
  }
  refresh();
}

export async function deleteComment(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase
    .from("ticket_comments")
    .delete()
    .eq("id", text(form, "id") ?? fail("Missing comment"));
  if (error) fail(error.message);
  refresh();
}

export async function editComment(form: FormData) {
  const { supabase, user } = await requireEvent();
  const { error } = await supabase
    .from("ticket_comments")
    .update({ body: text(form, "body") ?? fail("A comment can't be empty"), edited_at: new Date().toISOString() })
    .eq("id", text(form, "id") ?? fail("Missing comment"))
    .eq("author_id", user.id);
  if (error) fail(error.message);
  refresh();
}

// ── Notification settings ────────────────────────────────────

export async function setNotifications(form: FormData) {
  const { supabase, user } = await requireEvent();
  const { error } = await supabase
    .from("profiles")
    .update({
      notify_assigned: form.get("notify_assigned") === "on",
    })
    .eq("id", user.id);
  if (error) {
    const hint = /notify_/.test(error.message)
      ? "The database is missing upgrade 5 (005_notifications_and_comments.sql). Run it in Supabase, then try again."
      : error.message;
    redirect(`/settings?error=${encodeURIComponent(hint)}`);
  }
  refresh();
  redirect("/settings?saved=notifications");
}

// ── Events ───────────────────────────────────────────────

export async function updateEvent(form: FormData) {
  const { supabase, event } = await requireEvent();
  const { error } = await supabase
    .from("events")
    .update({
      name: text(form, "name") ?? event.name,
      event_type: text(form, "event_type") ?? event.event_type,
      event_date: text(form, "event_date"),
      location: text(form, "location"),
      total_budget: num(form, "total_budget") ?? 0,
    })
    .eq("id", event.id);
  if (error) fail(error.message);
  refresh();
}

export async function switchEvent(form: FormData) {
  const id = text(form, "event_id");
  if (id) {
    (await cookies()).set(CURRENT_EVENT_COOKIE, id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  refresh();
  redirect(text(form, "to") ?? "/hq");
}

export async function deleteEvent(form: FormData) {
  const { supabase, event, user } = await requireEvent();
  if (event.created_by !== user.id) fail("Only the person who created this event can delete it.");
  if (text(form, "confirm_name") !== event.name) fail("Type the event name exactly to delete it.");
  const { error } = await supabase.from("events").delete().eq("id", event.id);
  if (error) fail(error.message);
  (await cookies()).delete(CURRENT_EVENT_COOKIE);
  refresh();
  redirect("/events");
}

// ── Teams ────────────────────────────────────────────────────

export async function renameTeam(form: FormData) {
  const { supabase, team } = await requireEvent();
  const { error } = await supabase
    .from("teams")
    .update({ name: text(form, "name") ?? fail("Give your team a name") })
    .eq("id", team.id);
  if (error) fail(error.message);
  refresh();
}

export async function resetInviteLink() {
  const { supabase, team } = await requireEvent();
  const { error } = await supabase.rpc("reset_team_invite", { p_team_id: team.id });
  if (error) fail(error.message);
  refresh();
}

export async function removeMember(form: FormData) {
  const { supabase, team, user } = await requireEvent();
  const userId = text(form, "user_id") ?? fail("Missing person");
  if (userId === team.created_by) fail("The team's creator can't be removed.");
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", team.id)
    .eq("user_id", userId);
  if (error) fail(error.message);
  refresh();
  if (userId === user.id) {
    (await cookies()).delete(CURRENT_EVENT_COOKIE);
    redirect("/events");
  }
}

// ── Personal or team view ────────────────────────────────────

export async function setViewMode(form: FormData) {
  const { supabase, user } = await requireEvent();
  const mode = text(form, "view_mode") === "personal" ? "personal" : "team";
  const { error } = await supabase.from("profiles").update({ view_mode: mode }).eq("id", user.id);
  if (error) {
    const hint = /view_mode/.test(error.message)
      ? "The database is missing upgrade 4 (004_view_mode.sql). Run it in Supabase, then try again."
      : error.message;
    redirect(`/settings?error=${encodeURIComponent(hint)}`);
  }
  refresh();
  redirect(`/settings?switched=${mode}`);
}

// ── Your profile ─────────────────────────────────────────────

export async function updateProfile(form: FormData) {
  const { supabase, user } = await requireEvent();
  const fullName = (text(form, "full_name") ?? "").replace(/\s+/g, " ");
  if (fullName.length < 2) redirect(`/settings?error=${encodeURIComponent("Please enter your full name.")}#profile`);
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id);
  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  refresh();
  redirect("/settings?saved=profile#profile");
}

// ── Itinerary ────────────────────────────────────────────────

function whoFields(form: FormData) {
  const who = text(form, "who") ?? "";
  return {
    responsible_user_id: who.startsWith("user:") ? who.slice(5) : null,
    vendor_id: who.startsWith("vendor:") ? who.slice(7) : null,
  };
}

function itemFields(form: FormData) {
  return {
    start_time: text(form, "start_time"),
    end_time: text(form, "end_time"),
    title: text(form, "title") ?? fail("Give this item a name"),
    location: text(form, "location"),
    notes: text(form, "notes"),
    ...whoFields(form),
  };
}

export async function addItineraryDay(form: FormData) {
  const { supabase, event } = await requireEvent();
  const { data, error } = await supabase
    .from("itinerary_days")
    .insert({
      event_id: event.id,
      title: text(form, "title") ?? fail("Give this day a name"),
      day_date: text(form, "day_date"),
    })
    .select("id")
    .single();
  if (error) {
    const hint = /itinerary_days/.test(error.message)
      ? "The database is missing upgrade 7 (007_itinerary.sql). Run it in Supabase, then try again."
      : error.message;
    fail(hint);
  }
  refresh();
  redirect(`/itinerary?day=${data!.id}`);
}

export async function updateItineraryDay(form: FormData) {
  const { supabase } = await requireEvent();
  const id = text(form, "id") ?? fail("Missing day");
  const { error } = await supabase
    .from("itinerary_days")
    .update({ title: text(form, "title") ?? fail("Give this day a name"), day_date: text(form, "day_date") })
    .eq("id", id);
  if (error) fail(error.message);
  refresh();
}

export async function deleteItineraryDay(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase.from("itinerary_days").delete().eq("id", text(form, "id") ?? fail("Missing day"));
  if (error) fail(error.message);
  refresh();
  redirect("/itinerary");
}

export async function addItineraryItem(form: FormData) {
  const { supabase, event } = await requireEvent();
  const { error } = await supabase.from("itinerary_items").insert({
    event_id: event.id,
    day_id: text(form, "day_id") ?? fail("Missing day"),
    ...itemFields(form),
  });
  if (error) fail(error.message);
  refresh();
}

export async function updateItineraryItem(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase
    .from("itinerary_items")
    .update(itemFields(form))
    .eq("id", text(form, "id") ?? fail("Missing item"));
  if (error) fail(error.message);
  refresh();
}

export async function deleteItineraryItem(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase.from("itinerary_items").delete().eq("id", text(form, "id") ?? fail("Missing item"));
  if (error) fail(error.message);
  refresh();
}

export async function setItinerarySharing(form: FormData) {
  const { supabase, event } = await requireEvent();
  const on = text(form, "on") === "1";
  const token = on ? crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8) : null;
  const { error } = await supabase.from("events").update({ itinerary_share_token: token }).eq("id", event.id);
  if (error) fail(error.message);
  refresh();
}

// ── Expenses ─────────────────────────────────────────────────

function payerFields(form: FormData) {
  const v = text(form, "paid_by") ?? "";
  if (v.startsWith("user:")) return { paid_by_user_id: v.slice(5), paid_by_name: null };
  if (v.startsWith("name:")) return { paid_by_user_id: null, paid_by_name: v.slice(5) };
  if (v === "other") return { paid_by_user_id: null, paid_by_name: text(form, "paid_by_name") };
  return { paid_by_user_id: null, paid_by_name: null };
}

function missingUpgrade8(message: string) {
  return /expenses|paid_by|method/.test(message)
    ? "The database is missing upgrade 8 (008_expenses.sql). Run it in Supabase, then try again."
    : message;
}

export async function addExpense(form: FormData) {
  const { supabase, event, user } = await requireEvent();
  const { error } = await supabase.from("expenses").insert({
    event_id: event.id,
    spent_on: text(form, "spent_on") ?? todayISO(),
    description: text(form, "description") ?? fail("What was this expense for?"),
    category: text(form, "category") ?? "Other",
    amount: num(form, "amount") ?? fail("Enter an amount"),
    method: text(form, "method"),
    vendor_id: text(form, "vendor_id"),
    notes: text(form, "notes"),
    created_by: user.id,
    ...payerFields(form),
  });
  if (error) fail(missingUpgrade8(error.message));
  refresh();
  redirect("/budget?tab=expenses&added=1");
}

export async function updateExpense(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase
    .from("expenses")
    .update({
      spent_on: text(form, "spent_on") ?? todayISO(),
      description: text(form, "description") ?? fail("What was this expense for?"),
      category: text(form, "category") ?? "Other",
      amount: num(form, "amount") ?? fail("Enter an amount"),
      method: text(form, "method"),
      vendor_id: text(form, "vendor_id"),
      notes: text(form, "notes"),
      ...payerFields(form),
    })
    .eq("id", text(form, "id") ?? fail("Missing expense"));
  if (error) fail(missingUpgrade8(error.message));
  refresh();
  redirect("/budget?tab=expenses");
}

export async function deleteExpense(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase.from("expenses").delete().eq("id", text(form, "id") ?? fail("Missing expense"));
  if (error) fail(error.message);
  refresh();
  redirect("/budget?tab=expenses");
}

/** Who paid / when / how for a vendor payment that's already marked paid. */
export async function updatePaymentDetails(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase
    .from("payments")
    .update({ paid_on: text(form, "spent_on"), method: text(form, "method"), ...payerFields(form) })
    .eq("id", text(form, "id") ?? fail("Missing payment"));
  if (error) fail(missingUpgrade8(error.message));
  refresh();
  redirect("/budget?tab=expenses");
}

// ── Duplicate review ─────────────────────────────────────────

async function setDuplicateOk(supabase: Awaited<ReturnType<typeof requireEvent>>["supabase"], key: string) {
  const [kind, id] = key.split(":");
  const table = kind === "p" ? "payments" : "expenses";
  return supabase.from(table).update({ duplicate_ok: true }).eq("id", id);
}

/** "Not a duplicate": stop flagging this pair. */
export async function markNotDuplicate(form: FormData) {
  const { supabase } = await requireEvent();
  for (const key of [text(form, "a"), text(form, "b")]) {
    if (!key) continue;
    const { error } = await setDuplicateOk(supabase, key);
    if (error) fail(/duplicate_ok/.test(error.message) ? "The database is missing upgrade 9 (009_duplicate_checks.sql). Run it in Supabase, then try again." : error.message);
  }
  refresh();
  redirect("/budget?tab=expenses&review=1");
}

/** Remove one entry of a duplicate pair. */
export async function removeDuplicate(form: FormData) {
  const { supabase } = await requireEvent();
  const [kind, id] = (text(form, "key") ?? fail("Missing entry")).split(":");
  const { error } = await supabase.from(kind === "p" ? "payments" : "expenses").delete().eq("id", id);
  if (error) fail(error.message);
  refresh();
  redirect("/budget?tab=expenses&review=1&removed=1");
}
