import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY in env");
}

// This client is just for auth.getUser() validation
export const supabase = createClient(
  SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY ?? "",  // ← Changed to ANON
  { auth: { persistSession: false } }
);