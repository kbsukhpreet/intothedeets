"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { ACCOUNT_PURPOSES } from "@/lib/format";

function safeNext(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/hq";
}

async function siteUrl() {
  if (SITE_URL) return SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function back(mode: string, next: string, params: Record<string, string>) {
  const q = new URLSearchParams({ mode, next, ...params });
  return `/login?${q.toString()}`;
}

function friendly(message: string) {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match. Try again.";
  if (/email not confirmed/i.test(message))
    return "This account was created before email confirmation was turned off. Ask the site owner to confirm it in Supabase, or sign up with a different email.";
  if (/already registered|already exists/i.test(message)) return "There's already an account with that email. Try logging in instead.";
  if (/rate limit/i.test(message)) return "Too many attempts. Please wait a few minutes and try again.";
  return message;
}

export async function logIn(form: FormData) {
  const next = safeNext(form.get("next"));
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(back("login", next, { error: friendly(error.message), email }));

  redirect(next);
}

export async function signUp(form: FormData) {
  const next = safeNext(form.get("next"));
  const fullName = String(form.get("full_name") ?? "").trim().replace(/\s+/g, " ");
  const email = String(form.get("email") ?? "").trim();
  const purpose = String(form.get("purpose") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm_password") ?? "");

  const keep = { full_name: fullName, email, purpose };
  const err = (error: string) => redirect(back("signup", next, { error, ...keep }));

  if (fullName.length < 2) err("Please enter your full name.");
  if (!ACCOUNT_PURPOSES.some((p) => p.value === purpose)) err("Please tell us what you'll use Into the Deets for.");
  if (password.length < 8) err("Use at least 8 characters for your password.");
  if (password !== confirm) err("The two passwords don't match.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, purpose },
      emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) err(friendly(error.message));

  // Supabase returns a user with no identities when the email is already taken.
  if (data.user && data.user.identities?.length === 0) {
    err("There's already an account with that email. Try logging in instead.");
  }

  if (data.session) redirect(next);

  // Only happens if "Confirm email" is still switched on in Supabase.
  redirect(
    back("login", next, {
      message: `Almost there! We sent a confirmation link to ${email}. Click it, then come back and log in.`,
      email,
    })
  );
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
