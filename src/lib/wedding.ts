import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Wedding = {
  id: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  location: string | null;
  total_budget: number;
};

/**
 * Returns the logged-in user and their wedding.
 * Sends them to /login or /onboarding if either is missing.
 */
export async function requireWedding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("wedding_members")
    .select("wedding_id, role, display_name")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const { data: wedding } = await supabase
    .from("weddings")
    .select("id, partner1_name, partner2_name, wedding_date, location, total_budget")
    .eq("id", membership.wedding_id)
    .single();

  if (!wedding) redirect("/onboarding");

  return {
    supabase,
    user,
    wedding: wedding as Wedding,
    member: membership as { wedding_id: string; role: string; display_name: string | null },
  };
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
