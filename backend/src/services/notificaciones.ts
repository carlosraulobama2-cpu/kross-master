import { db } from '../lib/supabase';
import { logger } from '../lib/logger';

interface Notificacion {
  titulo: string;
  cuerpo: string;
  tipo?: string;
  datos?: Record<string, unknown>;
}

/**
 * Guarda la notificación en la bandeja del usuario y la envía como push
 * (Expo Push API) si tiene token. Nunca lanza: notificar es secundario.
 */
export async function notificar(usuarioIds: string | string[], n: Notificacion): Promise<void> {
  const ids = [...new Set(Array.isArray(usuarioIds) ? usuarioIds : [usuarioIds])];
  if (ids.length === 0) return;

  try {
    await db.from('notificaciones').insert(
      ids.map((usuario_id) => ({ usuario_id, titulo: n.titulo, cuerpo: n.cuerpo, tipo: n.tipo ?? 'info', datos: n.datos ?? {} })),
    );

    const { data: destinos } = await db.from('usuarios').select('push_token').in('id', ids).not('push_token', 'is', null);
    const mensajes = (destinos ?? [])
      .map((d) => d.push_token as string)
      .filter((t) => t.startsWith('ExponentPushToken'))
      .map((to) => ({ to, title: n.titulo, body: n.cuerpo, data: n.datos ?? {}, sound: 'default' }));

    // La API de Expo acepta lotes de hasta 100 mensajes.
    for (let i = 0; i < mensajes.length; i += 100) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(mensajes.slice(i, i + 100)),
      });
    }
  } catch (err) {
    logger.warn({ err }, 'Fallo al notificar');
  }
}
