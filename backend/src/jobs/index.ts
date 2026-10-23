import { db } from '../lib/supabase';
import { logger } from '../lib/logger';
import { notificar } from '../services/notificaciones';

const UN_MINUTO = 60 * 1000;

async function ejecutar(nombre: string, fn: string) {
  const { data, error } = await db.rpc(fn);
  if (error) logger.error({ error }, `Job ${nombre} falló`);
  else if (data) logger.info({ afectados: data }, `Job ${nombre}`);
}

/** Avisa a la lista de espera de eventos que vuelven a tener entradas. */
export async function avisarListaEspera(): Promise<number> {
  const { data, error } = await db.rpc('avisos_lista_espera');
  if (error) {
    logger.error({ error }, 'Job lista de espera falló');
    return 0;
  }
  const avisos = (data ?? []) as { usuario_id: string; evento_id: string; titulo: string }[];
  for (const a of avisos) {
    await notificar(a.usuario_id, {
      titulo: '¡Hay entradas otra vez!',
      cuerpo: `Se han liberado entradas para ${a.titulo}. Corre, que vuelan.`,
      tipo: 'lista_espera',
      datos: { eventoId: a.evento_id },
    });
  }
  return avisos.length;
}

/** Libera reservas caducadas, avisa a la lista de espera y cierra eventos pasados. */
export function iniciarJobs(): () => void {
  const cadaMinuto = setInterval(() => {
    void ejecutar('liberar_reservas', 'liberar_pedidos_expirados').then(avisarListaEspera);
  }, UN_MINUTO);
  const eventos = setInterval(() => void ejecutar('finalizar_eventos', 'finalizar_eventos_pasados'), 15 * UN_MINUTO);
  return () => {
    clearInterval(cadaMinuto);
    clearInterval(eventos);
  };
}
