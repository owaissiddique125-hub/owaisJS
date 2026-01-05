// supabase.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://iykoqwuljgcyhskonlic.supabase.co";

// Use SERVICE_ROLE_KEY for admin operations (delete, update without RLS restrictions)
// This key has full access and bypasses RLS policies
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  throw new Error("Supabase URL not found.");
}

if (!SUPABASE_SERVICE_KEY) {
  console.warn('⚠️  SUPABASE_SERVICE_KEY not found in environment variables');
}

// Create client with SERVICE_ROLE_KEY for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY);

module.exports = supabase;