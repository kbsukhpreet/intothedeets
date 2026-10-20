// Keys copied from a dashboard sometimes pick up invisible characters, spaces,
// quotes or symbols (like "→"). Real Supabase URLs and keys only ever contain
// plain ASCII characters, so anything else is stripped out here.
function clean(value: string | undefined) {
  return (value ?? "").replace(/[^\x21-\x7E]/g, "").replace(/^["']|["']$/g, "");
}

export const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const SITE_URL = clean(process.env.NEXT_PUBLIC_SITE_URL).replace(/\/+$/, "");
