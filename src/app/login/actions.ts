"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/hq";
}

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function back(mode: string, next: string, params: Record<string, string>) {
  const q = new URLSearchParams({ mode, next, ...params });
  return `/login?${q.toString()}`;
}

export async function logIn(form: FormData) {
  const next = safeNext(form.get("next"));
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(back("login", next, { error: error.message }));

  redirect(next);
}

export async function signUp(form: FormData) {
  const next = safeNext(form.get("next"));
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (password.length < 8) {
    redirect(back("signup", next, { error: "Use at least 8 characters for your password." }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) redirect(back("signup", next, { error: error.message }));

  // If email confirmation is turned off in Supabase, they're logged in right away.
  if (data.session) redirect(next);

  redirect(
    back("login", next, {
      message: `Almost there! We sent a confirmation link to ${email}. Click it, then come back and log in.`,
    })
  );
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
