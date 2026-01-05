import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iykoqwuljgcyhskonlic.supabase.co"
const SUPABASE_ANON_KEY ="sb_publishable_vH91epvFaHLHOTKU6abgjQ_p6y7xX_E"        

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Supabase URL or Anon key not found. Check app.json extra values.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
