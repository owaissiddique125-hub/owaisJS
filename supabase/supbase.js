const { createClient } = require("@supabase/supabase-js"); // require ki jagah import

const SUPABASE_URL = "https://iykoqwuljgcyhskonlic.supabase.co";
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5a29xd3VsamdjeWhza29ubGljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg0MzM5NSwiZXhwIjoyMDgwNDE5Mzk1fQ.CwEwKLN3nKuszTDweNaFB8H6mRBRDnGeCsp719drwg0";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("Supabase URL or Service key not found.");
}

// Client banaya
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Sirf ye aik line kafi hai export ke liye
module.exports = supabase;
