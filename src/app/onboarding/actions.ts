"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { num, text } from "@/lib/wedding";

export async function createWedding(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_wedding", {
    p_partner1_name: text(form, "partner1_name") ?? "",
    p_partner2_name: text(form, "partner2_name") ?? "",
    p_wedding_date: text(form, "wedding_date"),
    p_location: text(form, "location"),
    p_total_budget: num(form, "total_budget") ?? 0,
    p_display_name: text(form, "display_name"),
  });

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/hq");
}
