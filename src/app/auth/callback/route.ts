import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Where the confirmation link in the sign-up email lands.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next") ?? "/hq";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/hq";

  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }

  if (ok) return NextResponse.redirect(`${origin}${next}`);

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "That link didn't work or has expired. Try logging in, or sign up again."
    )}`
  );
}
