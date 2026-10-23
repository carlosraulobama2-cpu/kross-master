import { db } from '../lib/supabase';
import { logger } from '../lib/logger';
import { notificar } from '../services/notificaciones';
import { pagarVendedores } from '../services/pagos';

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

/** Recordatorios 24 h antes y al abrir puertas, a quien tiene entrada. */
export async function enviarRecordatorios(): Promise<number> {
  const { data, error } = await db.rpc('recordatorios_pendientes');
  if (error) {
    logger.error({ error }, 'Job recordatorios falló');
    return 0;
  }
  const filas = (data ?? []) as { usuario_id: string; evento_id: string; titulo: string; tipo: '24h' | 'puertas'; inicia_en: string }[];
  const grupos = new Map<string, { ids: string[]; fila: (typeof filas)[number] }>();
  for (const f of filas) {
    const clave = `${f.evento_id}:${f.tipo}`;
    const g = grupos.get(clave) ?? { ids: [], fila: f };
    g.ids.push(f.usuario_id);
    grupos.set(clave, g);
  }
  for (const { ids, fila } of grupos.values()) {
    const hora = new Date(fila.inicia_en).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
    await notificar(ids, {
      titulo: fila.tipo === '24h' ? `Mañana: ${fila.titulo}` : `¡Puertas abiertas! ${fila.titulo}`,
      cuerpo: fila.tipo === '24h' ? `Empieza a las ${hora}. Tu entrada está en la app y funciona sin conexión.` : 'Ten tu entrada a mano: sube el brillo y enséñala en la puerta.',
      tipo: 'recordatorio',
      datos: { eventoId: fila.evento_id },
    });
  }
  return filas.length;
}

/** Reintenta los pagos a vendedores de reventa que fallaron. */
async function reintentarPagosReventa() {
  const { data } = await db.from('reventas').select('pedido_id').eq('estado', 'vendida').is('reembolso_vendedor_en', null).limit(50);
  for (const pedidoId of new Set((data ?? []).map((r) => r.pedido_id as string))) await pagarVendedores(pedidoId);
}

/** Tareas periódicas: reservas, colas, avisos, recordatorios y cierre de eventos. */
export function iniciarJobs(): () => void {
  const temporizadores = [
    setInterval(() => void ejecutar('admitir_cola', 'admitir_cola'), 15_000),
    setInterval(() => {
      void ejecutar('liberar_reservas', 'liberar_pedidos_expirados').then(avisarListaEspera).then(reintentarPagosReventa);
    }, UN_MINUTO),
    setInterval(() => void enviarRecordatorios(), 5 * UN_MINUTO),
    setInterval(() => void ejecutar('finalizar_eventos', 'finalizar_eventos_pasados'), 15 * UN_MINUTO),
  ];
  return () => temporizadores.forEach(clearInterval);
}
