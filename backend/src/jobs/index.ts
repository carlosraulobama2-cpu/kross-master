import { db } from '../lib/supabase';
import { logger } from '../lib/logger';

const UN_MINUTO = 60 * 1000;

async function ejecutar(nombre: string, fn: string) {
  const { data, error } = await db.rpc(fn);
  if (error) logger.error({ error }, `Job ${nombre} falló`);
  else if (data) logger.info({ afectados: data }, `Job ${nombre}`);
}

/** Libera reservas caducadas y cierra eventos pasados. */
export function iniciarJobs(): () => void {
  const reservas = setInterval(() => void ejecutar('liberar_reservas', 'liberar_pedidos_expirados'), UN_MINUTO);
  const eventos = setInterval(() => void ejecutar('finalizar_eventos', 'finalizar_eventos_pasados'), 15 * UN_MINUTO);
  return () => {
    clearInterval(reservas);
    clearInterval(eventos);
  };
}
