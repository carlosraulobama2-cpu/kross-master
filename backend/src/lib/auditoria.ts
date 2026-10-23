import { db } from './supabase';
import { logger } from './logger';

/** Registra una acción sensible. Nunca rompe la petición si falla. */
export async function auditar(
  actorId: string | null,
  accion: string,
  entidad: string,
  entidadId: string | null,
  datos: Record<string, unknown> = {},
) {
  const { error } = await db.from('auditoria').insert({ actor_id: actorId, accion, entidad, entidad_id: entidadId, datos });
  if (error) logger.warn({ error, accion }, 'No se pudo registrar auditoría');
}
