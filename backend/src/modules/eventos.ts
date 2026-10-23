import { Router } from 'express';
import { z } from 'zod';
import { AppError, noEncontrado } from '../lib/errors';
import { CATEGORIAS, idParam, paginacion, rango } from '../lib/schemas';
import { db, ok } from '../lib/supabase';
import { optionalAuth, requireAuth, usuarioDe } from '../middleware/auth';
import { body, params, query } from '../middleware/validate';

export const eventosRouter = Router();

const listadoSchema = paginacion.extend({
  q: z.string().trim().max(80).optional(),
  categoria: z.enum(CATEGORIAS).optional(),
  ciudad: z.string().trim().max(80).optional(),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  destacados: z.enum(['true', 'false']).optional(),
  orden: z.enum(['fecha', 'precio', 'recientes']).default('fecha'),
});

/** Quita los caracteres con significado en los filtros de PostgREST. */
const limpiar = (texto: string) => texto.replace(/[,()*%\\]/g, ' ').trim();

eventosRouter.get('/', async (req, res) => {
  const f = query(req, listadoSchema);
  const [desde, hasta] = rango(f);

  let consulta = db
    .from('catalogo_eventos')
    .select('*', { count: 'exact' })
    .gte('inicia_en', (f.desde ?? new Date()).toISOString());

  if (f.hasta) consulta = consulta.lte('inicia_en', f.hasta.toISOString());
  if (f.categoria) consulta = consulta.eq('categoria', f.categoria);
  if (f.ciudad) consulta = consulta.ilike('ciudad', limpiar(f.ciudad));
  if (f.destacados === 'true') consulta = consulta.eq('destacado', true);
  if (f.q) {
    const q = limpiar(f.q);
    if (q) {
      consulta = consulta.or(
        ['titulo', 'recinto', 'ciudad', 'organizador_nombre'].map((c) => `${c}.ilike.*${q}*`).join(','),
      );
    }
  }

  if (f.orden === 'precio') consulta = consulta.order('precio_desde_centimos', { ascending: true });
  else if (f.orden === 'recientes') consulta = consulta.order('creado_en', { ascending: false });
  else consulta = consulta.order('destacado', { ascending: false }).order('inicia_en', { ascending: true });

  const { data, error, count } = await consulta.range(desde, hasta);
  if (error) throw error;
  res.json({ eventos: data, total: count ?? 0, pagina: f.pagina, porPagina: f.porPagina });
});

eventosRouter.get('/ciudades', async (_req, res) => {
  const filas = ok(await db.from('catalogo_eventos').select('ciudad').gte('inicia_en', new Date().toISOString()));
  const conteo = new Map<string, number>();
  for (const { ciudad } of filas ?? []) conteo.set(ciudad, (conteo.get(ciudad) ?? 0) + 1);
  const ciudades = [...conteo.entries()].sort((a, b) => b[1] - a[1]).map(([nombre, eventos]) => ({ nombre, eventos }));
  res.json({ ciudades });
});

type EstadoTramo = 'a_la_venta' | 'agotado' | 'proximamente' | 'finalizado';

function estadoTramo(t: { cantidad_total: number; cantidad_vendida: number; cantidad_reservada: number; venta_inicia_en: string | null; venta_termina_en: string | null }): EstadoTramo {
  const ahora = Date.now();
  if (t.venta_inicia_en && new Date(t.venta_inicia_en).getTime() > ahora) return 'proximamente';
  if (t.venta_termina_en && new Date(t.venta_termina_en).getTime() <= ahora) return 'finalizado';
  if (t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada <= 0) return 'agotado';
  return 'a_la_venta';
}

eventosRouter.get('/:id', optionalAuth, async (req, res) => {
  const { id } = params(req, idParam);
  const evento = ok(await db.from('catalogo_eventos').select('*').eq('id', id).maybeSingle());
  if (!evento) throw noEncontrado('Evento');

  const [tramos, resenas, favorito] = await Promise.all([
    db
      .from('tramos')
      .select('id, nombre, descripcion, precio_centimos, cantidad_total, cantidad_vendida, cantidad_reservada, max_por_pedido, venta_inicia_en, venta_termina_en, orden')
      .eq('evento_id', id)
      .eq('activo', true)
      .order('orden')
      .order('precio_centimos'),
    db.from('resenas').select('puntuacion').eq('evento_id', id),
    req.usuario
      ? db.from('favoritos').select('evento_id').eq('evento_id', id).eq('usuario_id', req.usuario.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const puntuaciones = (resenas.data ?? []).map((r) => r.puntuacion as number);
  res.json({
    evento: {
      ...evento,
      favorito: Boolean(favorito.data),
      valoracion: {
        media: puntuaciones.length ? puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length : null,
        total: puntuaciones.length,
      },
      tramos: (tramos.data ?? []).map((t) => ({
        id: t.id,
        nombre: t.nombre,
        descripcion: t.descripcion,
        precio_centimos: t.precio_centimos,
        max_por_pedido: t.max_por_pedido,
        disponibles: Math.max(t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada, 0),
        venta_inicia_en: t.venta_inicia_en,
        estado: estadoTramo(t),
      })),
    },
  });
});

eventosRouter.put('/:id/favorito', requireAuth, async (req, res) => {
  const { id } = params(req, idParam);
  ok(await db.from('favoritos').upsert({ usuario_id: usuarioDe(req).id, evento_id: id }));
  res.status(204).end();
});

eventosRouter.delete('/:id/favorito', requireAuth, async (req, res) => {
  const { id } = params(req, idParam);
  ok(await db.from('favoritos').delete().eq('usuario_id', usuarioDe(req).id).eq('evento_id', id));
  res.status(204).end();
});

eventosRouter.get('/:id/resenas', async (req, res) => {
  const { id } = params(req, idParam);
  const resenas = ok(
    await db
      .from('resenas')
      .select('id, puntuacion, comentario, creado_en, usuario:usuarios(nombre, avatar_url)')
      .eq('evento_id', id)
      .order('creado_en', { ascending: false })
      .limit(50),
  );
  res.json({ resenas });
});

/** Solo puede opinar quien tuvo entrada y el evento ya empezó. */
eventosRouter.put('/:id/resena', requireAuth, async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const datos = body(
    req,
    z.object({ puntuacion: z.number().int().min(1).max(5), comentario: z.string().trim().max(1000).optional() }),
  );

  const { data: evento } = await db.from('eventos').select('inicia_en').eq('id', id).maybeSingle();
  if (!evento) throw noEncontrado('Evento');
  if (new Date(evento.inicia_en).getTime() > Date.now()) {
    throw new AppError(409, 'EVENTO_NO_CELEBRADO', 'Podrás valorar el evento cuando se celebre');
  }
  const { count } = await db
    .from('entradas')
    .select('id', { count: 'exact', head: true })
    .eq('evento_id', id)
    .eq('usuario_id', yo.id)
    .in('estado', ['valida', 'usada']);
  if (!count) throw new AppError(403, 'SIN_ENTRADA', 'Solo los asistentes pueden valorar el evento');

  const resena = ok(
    await db
      .from('resenas')
      .upsert({ evento_id: id, usuario_id: yo.id, ...datos }, { onConflict: 'evento_id,usuario_id' })
      .select()
      .single(),
  );
  res.json({ resena });
});
