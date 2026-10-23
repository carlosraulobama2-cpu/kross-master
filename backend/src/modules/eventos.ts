import { Router } from 'express';
import { z } from 'zod';
import { AppError, noEncontrado } from '../lib/errors';
import { generarIcs } from '../lib/ics';
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
  orden: z.enum(['fecha', 'precio', 'recientes', 'distancia']).default('fecha'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  km: z.coerce.number().min(1).max(500).default(50),
  accesible: z.enum(['true', 'false']).optional(),
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

  if (f.accesible === 'true') consulta = consulta.eq('tiene_accesibles', true);

  // Cerca de mí: solo eventos dentro del radio, ordenados por distancia.
  let distancias: Map<string, number> | null = null;
  if (f.lat !== undefined && f.lng !== undefined) {
    const { data: cerca, error: e } = await db.rpc('eventos_cerca', { p_lat: f.lat, p_lng: f.lng, p_km: f.km });
    if (e) throw e;
    distancias = new Map((cerca as { id: string; distancia_km: number }[]).map((c) => [c.id, c.distancia_km]));
    consulta = consulta.in('id', [...distancias.keys(), '00000000-0000-0000-0000-000000000000']);
  }

  if (distancias && f.orden === 'distancia') {
    // La distancia no es una columna: se ordena en memoria (el radio ya acota el resultado).
    const { data, error } = await consulta;
    if (error) throw error;
    const todos = (data ?? []).map((e) => ({ ...e, distancia_km: distancias!.get(e.id) ?? null })).sort((a, b) => (a.distancia_km ?? 0) - (b.distancia_km ?? 0));
    res.json({ eventos: todos.slice(desde, hasta + 1), total: todos.length, pagina: f.pagina, porPagina: f.porPagina });
    return;
  }

  const { data, error, count } = await consulta.range(desde, hasta);
  if (error) throw error;
  const eventos = distancias ? (data ?? []).map((e) => ({ ...e, distancia_km: distancias!.get(e.id) ?? null })) : data;
  res.json({ eventos, total: count ?? 0, pagina: f.pagina, porPagina: f.porPagina });
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

/** Gastos de gestión de una entrada suelta, para mostrar el precio final desde el principio. */
export async function calculadoraGastos(): Promise<(precio: number) => number> {
  const cfg = ok(await db.from('configuracion').select('gastos_gestion_porcentaje, gastos_gestion_fijo_centimos').eq('id', 1).single());
  return (precio) => (precio <= 0 ? 0 : Math.round((precio * Number(cfg.gastos_gestion_porcentaje)) / 100) + cfg.gastos_gestion_fijo_centimos);
}

eventosRouter.get('/:id', optionalAuth, async (req, res) => {
  const { id } = params(req, idParam);
  const { acceso } = query(req, z.object({ acceso: z.string().trim().toUpperCase().max(30).optional() }));
  const evento = ok(await db.from('catalogo_eventos').select('*').eq('id', id).maybeSingle());
  if (!evento) throw noEncontrado('Evento');

  const yo = req.usuario;
  const [tramos, resenas, favorito, espera, recinto, gastos, reventas, fan, turno] = await Promise.all([
    db
      .from('tramos')
      .select('id, nombre, descripcion, precio_centimos, cantidad_total, cantidad_vendida, cantidad_reservada, max_por_pedido, venta_inicia_en, venta_termina_en, orden, codigo_acceso, accesible, incluye_acompanante, numerado, fase_anterior_id')
      .eq('evento_id', id)
      .eq('activo', true)
      .order('orden')
      .order('precio_centimos'),
    db.from('resenas').select('puntuacion').eq('evento_id', id),
    yo ? db.from('favoritos').select('evento_id').eq('evento_id', id).eq('usuario_id', yo.id).maybeSingle() : Promise.resolve({ data: null }),
    yo ? db.from('lista_espera').select('avisado_en').eq('evento_id', id).eq('usuario_id', yo.id).maybeSingle() : Promise.resolve({ data: null }),
    evento.recinto_id
      ? db.from('recintos').select('id, nombre, direccion, ciudad, imagen_url, como_llegar, parking, accesibilidad, objetos_prohibidos').eq('id', evento.recinto_id).maybeSingle()
      : Promise.resolve({ data: null }),
    calculadoraGastos(),
    db.from('reventas').select('tramo_id').eq('evento_id', id).eq('estado', 'activa'),
    yo ? db.from('registros_fan').select('estado').eq('evento_id', id).eq('usuario_id', yo.id).maybeSingle() : Promise.resolve({ data: null }),
    yo && evento.cola_activa ? estadoCola(id, yo.id) : Promise.resolve(null),
  ]);
  const [{ data: aplazado }, { data: extras }] = await Promise.all([
    db.from('eventos').select('fecha_original, reembolso_aplazamiento_hasta').eq('id', id).single(),
    db
    .from('extras')
    .select('id, nombre, descripcion, tipo, precio_centimos, stock_total, stock_vendido, stock_reservado, max_por_pedido')
    .eq('evento_id', id)
    .eq('activo', true)
    .order('precio_centimos'),
  ]);
  // Fases: un tramo abre cuando se agota el anterior.
  const porId = new Map((tramos.data ?? []).map((t) => [t.id, t]));
  const libres = (t: { cantidad_total: number; cantidad_vendida: number; cantidad_reservada: number }) => t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada;
  const reventaPorTramo = new Map<string, number>();
  for (const r of reventas.data ?? []) reventaPorTramo.set(r.tramo_id, (reventaPorTramo.get(r.tramo_id) ?? 0) + 1);
  // Los fans verificados seleccionados ven la preventa sin código.
  const fanSeleccionado = fan.data?.estado === 'seleccionado';

  // Los tramos de preventa solo aparecen con su código.
  const visibles = (tramos.data ?? []).filter((t) => !t.codigo_acceso || t.codigo_acceso === acceso || fanSeleccionado);
  if (acceso && !visibles.some((t) => t.codigo_acceso === acceso)) {
    throw new AppError(404, 'PREVENTA_CODIGO', 'Ese código de preventa no es válido para este evento');
  }

  const puntuaciones = (resenas.data ?? []).map((r) => r.puntuacion as number);
  res.json({
    evento: {
      ...evento,
      fecha_original: aplazado?.fecha_original ?? null,
      reembolso_aplazamiento_hasta: aplazado?.reembolso_aplazamiento_hasta ?? null,
      favorito: Boolean(favorito.data),
      en_lista_espera: Boolean(espera.data && !espera.data.avisado_en),
      registro_fan: fan.data?.estado ?? null,
      cola: turno,
      recinto_info: recinto.data,
      valoracion: {
        media: puntuaciones.length ? puntuaciones.reduce((a, b) => a + b, 0) / puntuaciones.length : null,
        total: puntuaciones.length,
      },
      tramos: visibles.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        descripcion: t.descripcion,
        precio_centimos: t.precio_centimos,
        gastos_centimos: gastos(t.precio_centimos),
        precio_total_centimos: t.precio_centimos + gastos(t.precio_centimos),
        max_por_pedido: t.max_por_pedido,
        disponibles: Math.max(t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada, 0),
        venta_inicia_en: t.venta_inicia_en,
        estado: t.fase_anterior_id && porId.get(t.fase_anterior_id) && libres(porId.get(t.fase_anterior_id)!) > 0 ? ('proximamente' as const) : estadoTramo(t),
        abre_al_agotar: t.fase_anterior_id && porId.get(t.fase_anterior_id) && libres(porId.get(t.fase_anterior_id)!) > 0 ? porId.get(t.fase_anterior_id)!.nombre : null,
        numerado: t.numerado,
        preventa: Boolean(t.codigo_acceso),
        accesible: t.accesible,
        incluye_acompanante: t.incluye_acompanante,
        reventa_disponibles: reventaPorTramo.get(t.id) ?? 0,
      })),
      extras: (extras ?? []).map(({ stock_total, stock_vendido, stock_reservado, ...x }) => ({
        ...x,
        disponibles: Math.max(stock_total - stock_vendido - stock_reservado, 0),
      })),
    },
  });
});

const tramoParams = z.object({ id: z.string().uuid(), tramoId: z.string().uuid() });

/** Plano de butacas de un tipo de entrada numerado (solo si está libre u ocupada). */
eventosRouter.get('/:id/tramos/:tramoId/asientos', async (req, res) => {
  const { id, tramoId } = params(req, tramoParams);
  const evento = ok(await db.from('catalogo_eventos').select('id').eq('id', id).maybeSingle());
  if (!evento) throw noEncontrado('Evento');
  const asientos = ok(
    await db.from('asientos').select('id, seccion, fila, orden_fila, numero, estado').eq('tramo_id', tramoId).eq('evento_id', id).order('orden_fila').order('numero'),
  );
  res.json({ asientos: (asientos ?? []).map((a) => ({ ...a, estado: a.estado === 'libre' ? 'libre' : 'ocupado' })) });
});

/** Mejor sitio disponible: butacas juntas, delante y centradas. */
eventosRouter.get('/:id/tramos/:tramoId/mejores', async (req, res) => {
  const { tramoId } = params(req, tramoParams);
  const { n } = query(req, z.object({ n: z.coerce.number().int().min(1).max(20) }));
  const { data: ids, error } = await db.rpc('mejores_asientos', { p_tramo_id: tramoId, p_n: n });
  if (error) throw error;
  if (!ids || !(ids as string[]).length) throw new AppError(409, 'SIN_STOCK', 'No quedan tantas butacas libres');
  const asientos = ok(await db.from('asientos').select('id, seccion, fila, numero').in('id', ids as string[]).order('orden_fila').order('numero'));
  res.json({ asientos });
});

/** Archivo .ics para añadir el evento al calendario. */
eventosRouter.get('/:id/calendario.ics', async (req, res) => {
  const { id } = params(req, idParam);
  const e = ok(await db.from('catalogo_eventos').select('id, titulo, descripcion, inicia_en, termina_en, recinto, direccion, ciudad').eq('id', id).maybeSingle());
  if (!e) throw noEncontrado('Evento');
  res
    .type('text/calendar; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="kroos-${id.slice(0, 8)}.ics"`)
    .send(generarIcs(e));
});

/** Comprueba un código de descuento antes de comprar (no lo consume). */
eventosRouter.get('/:id/codigos/:codigo', async (req, res) => {
  const { id, codigo } = params(req, z.object({ id: z.string().uuid(), codigo: z.string().trim().toUpperCase().max(30) }));
  const ahora = new Date().toISOString();
  const { data: c } = await db
    .from('codigos_promocionales')
    .select('codigo, descripcion, tipo, valor, usos, usos_max, tramo_ids, valido_desde, valido_hasta')
    .eq('evento_id', id)
    .eq('codigo', codigo)
    .eq('activo', true)
    .maybeSingle();
  const vigente =
    c && (!c.valido_desde || c.valido_desde <= ahora) && (!c.valido_hasta || c.valido_hasta > ahora) && (c.usos_max === null || c.usos < c.usos_max);
  if (!c || !vigente) throw new AppError(404, 'CODIGO_INVALIDO', 'El código de descuento no es válido o ya se ha agotado');
  res.json({ codigo: { codigo: c.codigo, descripcion: c.descripcion, tipo: c.tipo, valor: c.valor, tramo_ids: c.tramo_ids } });
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

/** Lista de espera: avisamos cuando se liberen entradas. */
eventosRouter.put('/:id/lista-espera', requireAuth, async (req, res) => {
  const { id } = params(req, idParam);
  const e = ok(await db.from('catalogo_eventos').select('id').eq('id', id).maybeSingle());
  if (!e) throw noEncontrado('Evento');
  ok(await db.from('lista_espera').upsert({ usuario_id: usuarioDe(req).id, evento_id: id, avisado_en: null, creado_en: new Date().toISOString() }));
  res.status(204).end();
});

eventosRouter.delete('/:id/lista-espera', requireAuth, async (req, res) => {
  const { id } = params(req, idParam);
  ok(await db.from('lista_espera').delete().eq('usuario_id', usuarioDe(req).id).eq('evento_id', id));
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

// --- Cola virtual ----------------------------------------------------

export async function estadoCola(eventoId: string, usuarioId: string) {
  const { data: t } = await db.from('cola_turnos').select('posicion, admitido_en, expira_en').eq('evento_id', eventoId).eq('usuario_id', usuarioId).maybeSingle();
  if (!t) return { en_cola: false, admitido: false, por_delante: null, minutos_estimados: null, expira_en: null };
  const admitido = Boolean(t.admitido_en && t.expira_en && new Date(t.expira_en).getTime() > Date.now());
  if (t.admitido_en) return { en_cola: true, admitido, por_delante: 0, minutos_estimados: 0, expira_en: t.expira_en };
  const [{ count }, { data: ev }] = await Promise.all([
    db.from('cola_turnos').select('usuario_id', { count: 'exact', head: true }).eq('evento_id', eventoId).is('admitido_en', null).lt('posicion', t.posicion),
    db.from('eventos').select('cola_ritmo').eq('id', eventoId).single(),
  ]);
  const delante = count ?? 0;
  return { en_cola: true, admitido: false, por_delante: delante, minutos_estimados: Math.ceil((delante + 1) / (ev?.cola_ritmo ?? 50)), expira_en: null };
}

/** Entrar en la cola virtual (idempotente: conserva el puesto). */
eventosRouter.post('/:id/cola', requireAuth, async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const ev = ok(await db.from('catalogo_eventos').select('cola_activa').eq('id', id).maybeSingle());
  if (!ev) throw noEncontrado('Evento');
  if (!ev.cola_activa) throw new AppError(409, 'SIN_COLA', 'Este evento no tiene cola: puedes comprar directamente');
  const { error } = await db.from('cola_turnos').insert({ evento_id: id, usuario_id: yo.id });
  if (error && error.code !== '23505') throw error;
  res.json({ cola: await estadoCola(id, yo.id) });
});

eventosRouter.get('/:id/cola', requireAuth, async (req, res) => {
  const { id } = params(req, idParam);
  res.json({ cola: await estadoCola(id, usuarioDe(req).id) });
});

// --- Fans verificados --------------------------------------------------

eventosRouter.post('/:id/registro-fan', requireAuth, async (req, res) => {
  const { id } = params(req, idParam);
  const ev = ok(await db.from('catalogo_eventos').select('registro_fan_activo').eq('id', id).maybeSingle());
  if (!ev) throw noEncontrado('Evento');
  if (!ev.registro_fan_activo) throw new AppError(409, 'REGISTRO_CERRADO', 'El registro de fans de este evento está cerrado');
  const { error } = await db.from('registros_fan').insert({ evento_id: id, usuario_id: usuarioDe(req).id });
  if (error && error.code !== '23505') throw error;
  res.status(201).json({ registro_fan: 'inscrito' });
});
