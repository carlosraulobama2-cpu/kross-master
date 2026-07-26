import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados en el backend');
}

export const supabase: SupabaseClient = createClient(supabaseUrl || '', supabaseServiceRoleKey || '');
