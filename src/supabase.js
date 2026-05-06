import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arstapreharjmqmqwuia.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyc3RhcHJlaGFyam1xbXF3dWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4Mzk5NTgsImV4cCI6MjA5MzQxNTk1OH0.cik_XID1VL1W_owNRDo_XESiMfeyGClYKtR9MttMw6U'

export const supabase = createClient(supabaseUrl, supabaseKey)
