import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kbfvrmfcrimnomyaqzwd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZnZybWZjcmltbm9teWFxendkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NzI3MTEsImV4cCI6MjA3ODA0ODcxMX0.j--5rjhD4U9NLX-XOlekDXilnwygQ59g7aGkk4_YGns';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Note: Auth state changes are logged in AuthContext.js to avoid circular dependencies
// with the logger utility

export default supabase;

