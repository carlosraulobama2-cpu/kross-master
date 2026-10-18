import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
  console.warn('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados en el backend');
}

/** Cliente con la clave de servicio: salta las políticas RLS, por eso solo se usa en el backend. */
export const supabase: SupabaseClient = createClient(env.supabaseUrl || 'http://localhost', env.supabaseServiceRoleKey || 'sin-configurar');
