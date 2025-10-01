import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY in env");
}

console.log('🔧 Supabase config:', {
  url: SUPABASE_URL,
  hasAnonKey: !!SUPABASE_ANON_KEY
});

export const supabase = createClient(
  SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY ?? "",
  { auth: { persistSession: false } }
);