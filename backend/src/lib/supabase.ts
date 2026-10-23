import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const opciones = { auth: { persistSession: false, autoRefreshToken: false } };

/** Cliente con service_role: salta RLS. Solo se usa en el servidor. */
export const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opciones);

/** Cliente anónimo para login/registro (respeta la confirmación de email). */
export const authPublica = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, opciones);

/** Desempaqueta una respuesta de Supabase lanzando si hay error. */
export function ok<R extends { data: unknown; error: { message: string } | null }>(res: R): Extract<R, { error: null }>['data'] {
  if (res.error) throw res.error;
  return res.data as Extract<R, { error: null }>['data'];
}
