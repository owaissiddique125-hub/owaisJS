import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL or Anon key not found. Check app.json extra values.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Named export for ESM imports
export { supabase };
// Default export for default imports
export default supabase;

// CommonJS fallback for any require() usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = supabase;
}

