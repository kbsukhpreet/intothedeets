"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { num, requireWedding, text } from "@/lib/wedding";
import { todayISO } from "@/lib/format";

function refresh() {
  revalidatePath("/", "layout");
}

function fail(message: string): never {
  throw new Error(message);
}

// ── Vendors ──────────────────────────────────────────────────

export async function addVendor(form: FormData) {
  const { supabase, wedding } = await requireWedding();
  const name = text(form, "name") ?? fail("Vendor name is required");

  const { data, error } = await supabase
    .from("vendors")
    .insert({
      wedding_id: wedding.id,
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
  const { supabase } = await requireWedding();
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
  const { supabase } = await requireWedding();
  const id = text(form, "id") ?? fail("Missing vendor");
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) fail(error.message);
  refresh();
  redirect("/vendors");
}

// ── Conversation log ─────────────────────────────────────────

export async function addVendorNote(form: FormData) {
  const { supabase, wedding, user } = await requireWedding();
  const { error } = await supabase.from("vendor_notes").insert({
    wedding_id: wedding.id,
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
  const { supabase } = await requireWedding();
  const { error } = await supabase
    .from("vendor_notes")
    .delete()
    .eq("id", text(form, "id") ?? fail("Missing note"));
  if (error) fail(error.message);
  refresh();
}

// ── Payments ─────────────────────────────────────────────────

export async function addPayment(form: FormData) {
  const { supabase, wedding } = await requireWedding();
  const paid = form.get("paid") === "on";
  const { error } = await supabase.from("payments").insert({
    wedding_id: wedding.id,
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
  const { supabase } = await requireWedding();
  const paid = form.get("paid") === "true";
  const { error } = await supabase
    .from("payments")
    .update({ paid, paid_on: paid ? todayISO() : null })
    .eq("id", text(form, "id") ?? fail("Missing payment"));
  if (error) fail(error.message);
  refresh();
}

export async function deletePayment(form: FormData) {
  const { supabase } = await requireWedding();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", text(form, "id") ?? fail("Missing payment"));
  if (error) fail(error.message);
  refresh();
}

// ── Tasks ────────────────────────────────────────────────────

export async function addTask(form: FormData) {
  const { supabase, wedding, user } = await requireWedding();
  const { error } = await supabase.from("tasks").insert({
    wedding_id: wedding.id,
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
  const { supabase } = await requireWedding();
  const done = form.get("done") === "true";
  const { error } = await supabase
    .from("tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", text(form, "id") ?? fail("Missing task"));
  if (error) fail(error.message);
  refresh();
}

export async function deleteTask(form: FormData) {
  const { supabase } = await requireWedding();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", text(form, "id") ?? fail("Missing task"));
  if (error) fail(error.message);
  refresh();
}

// ── Wedding settings & partner invites ───────────────────────

export async function updateWedding(form: FormData) {
  const { supabase, wedding } = await requireWedding();
  const { error } = await supabase
    .from("weddings")
    .update({
      partner1_name: text(form, "partner1_name") ?? wedding.partner1_name,
      partner2_name: text(form, "partner2_name") ?? wedding.partner2_name,
      wedding_date: text(form, "wedding_date"),
      location: text(form, "location"),
      total_budget: num(form, "total_budget") ?? 0,
    })
    .eq("id", wedding.id);
  if (error) fail(error.message);
  refresh();
}

export async function createInvite() {
  const { supabase, wedding, user } = await requireWedding();
  const { error } = await supabase
    .from("wedding_invites")
    .insert({ wedding_id: wedding.id, invited_by: user.id });
  if (error) fail(error.message);
  refresh();
}

export async function revokeInvite(form: FormData) {
  const { supabase } = await requireWedding();
  const { error } = await supabase
    .from("wedding_invites")
    .delete()
    .eq("id", text(form, "id") ?? fail("Missing invite"));
  if (error) fail(error.message);
  refresh();
}
