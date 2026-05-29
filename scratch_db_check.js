import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://arstapreharjmqmqwuia.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyc3RhcHJlaGFyam1xbXF3dWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4Mzk5NTgsImV4cCI6MjA5MzQxNTk1OH0.cik_XID1VL1W_owNRDo_XESiMfeyGClYKtR9MttMw6U';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    console.log("Checking if payments table exists...");
    const { data: payData, error: payError } = await supabase.from('payments').select('*').limit(1);
    if (payError) {
      console.log("payments table check error (does it exist?):", payError.message);
    } else {
      console.log("payments table exists! Rows:", payData);
    }

    console.log("Checking if plan columns exist in profiles table...");
    const { data: profData, error: profError } = await supabase.from('profiles').select('plan, plan_expires_at').limit(1);
    if (profError) {
      console.log("profiles plan columns error (do they exist?):", profError.message);
    } else {
      console.log("profiles plan columns exist! Rows:", profData);
    }
  } catch (err) {
    console.error("Uncaught exception during check:", err);
  }
}

check();
