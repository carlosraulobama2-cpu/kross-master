import { Router } from 'express';
import { z } from 'zod';
import { auditar } from '../lib/auditoria';
import { AppError, noEncontrado } from '../lib/errors';
import { idParam, paginacion, rango } from '../lib/schemas';
import { db, ok } from '../lib/supabase';
import { requireAuth, requireRol, usuarioDe } from '../middleware/auth';
import { body, params, query } from '../middleware/validate';
import { notificar } from '../services/notificaciones';
import { cancelarEvento, reembolsarPedido } from '../services/pagos';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRol('admin'));

const limpiar = (t: string) => t.replace(/[,()*%\\]/g, ' ').trim();

adminRouter.get('/resumen', async (req, res) => {
  const { dias } = query(req, z.object({ dias: z.coerce.number().int().min(7).max(365).default(30) }));
  const { data, error } = await db.rpc('resumen_plataforma', { p_dias: dias });
  if (error) throw error;
  res.json({ resumen: data });
});

// --- Usuarios --------------------------------------------------------

adminRouter.get('/usuarios', async (req, res) => {
  const f = query(
    req,
    paginacion.extend({ q: z.string().trim().max(80).optional(), rol: z.enum(['fan', 'organizador', 'admin']).optional() }),
  );
  let consulta = db
    .from('usuarios')
    .select('id, email, nombre, rol, nombre_artistico, ciudad, bloqueado, stripe_onboarding_completo, creado_en', { count: 'exact' })
    .order('creado_en', { ascending: false });
  if (f.rol) consulta = consulta.eq('rol', f.rol);
  if (f.q && limpiar(f.q)) {
    const q = limpiar(f.q);
    consulta = consulta.or(`email.ilike.*${q}*,nombre.ilike.*${q}*,nombre_artistico.ilike.*${q}*`);
  }
  const [desde, hasta] = rango(f);
  const { data, count, error } = await consulta.range(desde, hasta);
  if (error) throw error;
  res.json({ usuarios: data, total: count ?? 0 });
});

adminRouter.patch('/usuarios/:id', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const cambios = body(
    req,
    z.object({ rol: z.enum(['fan', 'organizador', 'admin']).optional(), bloqueado: z.boolean().optional() }).refine((c) => Object.keys(c).length > 0, 'Nada que cambiar'),
  );
  if (id === yo.id) throw new AppError(400, 'AUTOGESTION', 'No puedes cambiar tu propio rol ni bloquearte');

  const usuario = ok(await db.from('usuarios').update(cambios).eq('id', id).select('id, email, nombre, rol, bloqueado').maybeSingle());
  if (!usuario) throw noEncontrado('Usuario');
  // Bloquear también cierra sus sesiones abiertas.
  if (cambios.bloqueado) await db.auth.admin.signOut(id).catch(() => undefined);
  await auditar(yo.id, 'admin.usuario_actualizar', 'usuario', id, cambios);
  res.json({ usuario });
});

// --- Eventos ---------------------------------------------------------

adminRouter.get('/eventos', async (req, res) => {
  const f = query(
    req,
    paginacion.extend({
      q: z.string().trim().max(80).optional(),
      estado: z.enum(['borrador', 'publicado', 'cancelado', 'finalizado']).optional(),
    }),
  );
  let consulta = db
    .from('eventos')
    .select(
      'id, titulo, categoria, ciudad, recinto, inicia_en, estado, destacado, creado_en, ' +
        'organizador:usuarios!eventos_organizador_id_fkey(id, nombre, nombre_artistico, email), tramos(cantidad_total, cantidad_vendida)',
      { count: 'exact' },
    )
    .order('inicia_en', { ascending: false });
  if (f.estado) consulta = consulta.eq('estado', f.estado);
  if (f.q && limpiar(f.q)) consulta = consulta.ilike('titulo', `%${limpiar(f.q)}%`);
  const [desde, hasta] = rango(f);
  const { data, count, error } = await consulta.range(desde, hasta);
  if (error) throw error;

  const eventos = ((data ?? []) as unknown as Array<Record<string, unknown> & { tramos: { cantidad_total: number; cantidad_vendida: number }[] }>).map(
    ({ tramos, ...e }) => ({
      ...e,
      aforo: tramos.reduce((a, t) => a + t.cantidad_total, 0),
      vendidas: tramos.reduce((a, t) => a + t.cantidad_vendida, 0),
    }),
  );
  res.json({ eventos, total: count ?? 0 });
});

adminRouter.patch('/eventos/:id', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const cambios = body(
    req,
    z
      .object({ destacado: z.boolean().optional(), estado: z.enum(['borrador', 'publicado', 'finalizado']).optional() })
      .refine((c) => Object.keys(c).length > 0, 'Nada que cambiar'),
  );
  const evento = ok(
    await db.from('eventos').update({ ...cambios, actualizado_en: new Date().toISOString() }).eq('id', id).neq('estado', 'cancelado').select('id, titulo, estado, destacado').maybeSingle(),
  );
  if (!evento) throw new AppError(404, 'NO_ENCONTRADO', 'Evento no encontrado o cancelado');
  await auditar(yo.id, 'admin.evento_actualizar', 'evento', id, cambios);
  res.json({ evento });
});

adminRouter.post('/eventos/:id/cancelar', async (req, res) => {
  const { id } = params(req, idParam);
  const { motivo } = body(req, z.object({ motivo: z.string().trim().min(5).max(300) }));
  res.json(await cancelarEvento(id, usuarioDe(req).id, motivo));
});

// --- Pedidos ---------------------------------------------------------

adminRouter.get('/pedidos', async (req, res) => {
  const f = query(
    req,
    paginacion.extend({
      estado: z.enum(['pendiente', 'pagado', 'expirado', 'cancelado', 'reembolsado']).optional(),
      eventoId: z.string().uuid().optional(),
    }),
  );
  let consulta = db
    .from('pedidos')
    .select(
      'id, estado, subtotal_centimos, gastos_centimos, total_centimos, moneda, creado_en, pagado_en, stripe_payment_intent_id, ' +
        'usuario:usuarios(id, nombre, email), evento:eventos(id, titulo), items:pedido_items(cantidad)',
      { count: 'exact' },
    )
    .order('creado_en', { ascending: false });
  if (f.estado) consulta = consulta.eq('estado', f.estado);
  if (f.eventoId) consulta = consulta.eq('evento_id', f.eventoId);
  const [desde, hasta] = rango(f);
  const { data, count, error } = await consulta.range(desde, hasta);
  if (error) throw error;
  res.json({ pedidos: data, total: count ?? 0 });
});

adminRouter.post('/pedidos/:id/reembolsar', async (req, res) => {
  const { id } = params(req, idParam);
  const { motivo } = body(req, z.object({ motivo: z.string().trim().min(3).max(300) }));
  await reembolsarPedido(id, usuarioDe(req).id, motivo);
  res.status(204).end();
});

// --- Auditoría y configuración --------------------------------------

adminRouter.get('/auditoria', async (req, res) => {
  const f = query(req, paginacion.extend({ porPagina: z.coerce.number().int().min(1).max(100).default(50) }));
  const [desde, hasta] = rango(f);
  const { data, count, error } = await db
    .from('auditoria')
    .select('id, accion, entidad, entidad_id, datos, creado_en, actor:usuarios(nombre, email)', { count: 'exact' })
    .order('creado_en', { ascending: false })
    .range(desde, hasta);
  if (error) throw error;
  res.json({ registros: data, total: count ?? 0 });
});

const configSchema = z.object({
  gastos_gestion_porcentaje: z.number().min(0).max(30),
  gastos_gestion_fijo_centimos: z.number().int().min(0).max(1000),
  comision_plataforma_porcentaje: z.number().min(0).max(30),
  seguro_porcentaje: z.number().min(0).max(30),
  minutos_reserva: z.number().int().min(3).max(60),
  registro_abierto: z.boolean(),
  mantenimiento: z.boolean(),
  mensaje_mantenimiento: z.string().trim().max(300).nullable(),
  email_soporte: z.string().email().nullable(),
});

adminRouter.get('/configuracion', async (_req, res) => {
  res.json({ configuracion: ok(await db.from('configuracion').select('*').eq('id', 1).single()) });
});

adminRouter.put('/configuracion', async (req, res) => {
  const yo = usuarioDe(req);
  const cambios = body(req, configSchema.partial());
  const configuracion = ok(
    await db.from('configuracion').update({ ...cambios, actualizado_en: new Date().toISOString() }).eq('id', 1).select('*').single(),
  );
  await auditar(yo.id, 'admin.configuracion', 'configuracion', '1', cambios);
  res.json({ configuracion });
});

// --- Reclamaciones de la protección de reembolso --------------------

adminRouter.get('/reclamaciones', async (req, res) => {
  const f = query(req, paginacion.extend({ estado: z.enum(['pendiente', 'aprobada', 'rechazada']).optional() }));
  let consulta = db
    .from('reclamaciones_seguro')
    .select(
      'id, motivo, estado, respuesta, creado_en, resuelta_en, usuario:usuarios!reclamaciones_seguro_usuario_id_fkey(nombre, email), ' +
        'pedido:pedidos(id, total_centimos, seguro_centimos, evento:eventos(titulo, inicia_en))',
      { count: 'exact' },
    )
    .order('creado_en', { ascending: false });
  if (f.estado) consulta = consulta.eq('estado', f.estado);
  const [desde, hasta] = rango(f);
  const { data, count, error } = await consulta.range(desde, hasta);
  if (error) throw error;
  res.json({ reclamaciones: data, total: count ?? 0 });
});

/** Aprobar reembolsa el pedido menos el coste de la protección. */
adminRouter.post('/reclamaciones/:id', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const { decision, respuesta } = body(req, z.object({ decision: z.enum(['aprobada', 'rechazada']), respuesta: z.string().trim().min(3).max(500) }));
  const r = ok(await db.from('reclamaciones_seguro').select('estado, pedido:pedidos(id, total_centimos, seguro_centimos, usuario_id)').eq('id', id).maybeSingle()) as unknown as {
    estado: string;
    pedido: { id: string; total_centimos: number; seguro_centimos: number; usuario_id: string };
  } | null;
  if (!r) throw noEncontrado('Reclamación');
  if (r.estado !== 'pendiente') throw new AppError(409, 'YA_RESUELTA', 'Esta reclamación ya se ha resuelto');

  if (decision === 'aprobada') {
    await reembolsarPedido(r.pedido.id, yo.id, 'Protección de reembolso aprobada.', r.pedido.total_centimos - r.pedido.seguro_centimos);
  } else {
    await notificar(r.pedido.usuario_id, { titulo: 'Reclamación revisada', cuerpo: `No hemos podido aprobar tu reclamación: ${respuesta}`, tipo: 'pedido' });
  }
  ok(await db.from('reclamaciones_seguro').update({ estado: decision, respuesta, resuelta_en: new Date().toISOString(), resuelta_por: yo.id }).eq('id', id));
  await auditar(yo.id, `admin.reclamacion_${decision}`, 'pedido', r.pedido.id, { respuesta });
  res.status(204).end();
});
