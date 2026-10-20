"use server";

import { revalidatePath } from "next/cache";
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
  const { supabase, event } = await requireEvent();
  const paid = form.get("paid") === "on";
  const { error } = await supabase.from("payments").insert({
    event_id: event.id,
    vendor_id: text(form, "vendor_id"),
    label: text(form, "label") ?? "Payment",
    amount: num(form, "amount") ?? fail("Enter an amount"),
    due_date: text(form, "due_date"),
    paid,
    paid_on: paid ? todayISO() : null,
  });
  if (error) fail(error.message);
  refresh();
}

export async function togglePayment(form: FormData) {
  const { supabase } = await requireEvent();
  const paid = form.get("paid") === "true";
  const { error } = await supabase
    .from("payments")
    .update({ paid, paid_on: paid ? todayISO() : null })
    .eq("id", text(form, "id") ?? fail("Missing payment"));
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

// ── Tasks ────────────────────────────────────────────────────

export async function addTask(form: FormData) {
  const { supabase, event, user } = await requireEvent();
  const { error } = await supabase.from("tasks").insert({
    event_id: event.id,
    title: text(form, "title") ?? fail("Give the task a name"),
    due_date: text(form, "due_date"),
    vendor_id: text(form, "vendor_id"),
    notes: text(form, "notes"),
    created_by: user.id,
  });
  if (error) fail(error.message);
  refresh();
}

export async function toggleTask(form: FormData) {
  const { supabase } = await requireEvent();
  const done = form.get("done") === "true";
  const { error } = await supabase
    .from("tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", text(form, "id") ?? fail("Missing task"));
  if (error) fail(error.message);
  refresh();
}

export async function deleteTask(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", text(form, "id") ?? fail("Missing task"));
  if (error) fail(error.message);
  refresh();
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

// ── Collaborator invites ─────────────────────────────────────

export async function createInvite() {
  const { supabase, event, user } = await requireEvent();
  const { error } = await supabase
    .from("event_invites")
    .insert({ event_id: event.id, invited_by: user.id });
  if (error) fail(error.message);
  refresh();
}

export async function revokeInvite(form: FormData) {
  const { supabase } = await requireEvent();
  const { error } = await supabase
    .from("event_invites")
    .delete()
    .eq("id", text(form, "id") ?? fail("Missing invite"));
  if (error) fail(error.message);
  refresh();
}
