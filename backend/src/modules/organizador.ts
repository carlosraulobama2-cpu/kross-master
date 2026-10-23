import { Router } from 'express';
import { z } from 'zod';
import { auditar } from '../lib/auditoria';
import { AppError, noEncontrado, prohibido } from '../lib/errors';
import { CATEGORIAS, idParam, paginacion, rango, uuid } from '../lib/schemas';
import { db, ok } from '../lib/supabase';
import { requireAuth, requireRol, usuarioDe } from '../middleware/auth';
import { body, params, query } from '../middleware/validate';
import { cancelarEvento } from '../services/pagos';
import type { UsuarioSesion } from '../types';

export const organizadorRouter = Router();
organizadorRouter.use(requireAuth, requireRol('organizador', 'admin'));

interface EventoFila {
  id: string;
  organizador_id: string;
  estado: 'borrador' | 'publicado' | 'cancelado' | 'finalizado';
  inicia_en: string;
  titulo: string;
}

/** Carga el evento y comprueba que es mío (o soy admin). */
async function miEvento(usuario: UsuarioSesion, id: string): Promise<EventoFila> {
  const evento = ok(await db.from('eventos').select('id, organizador_id, estado, inicia_en, titulo').eq('id', id).maybeSingle());
  if (!evento) throw noEncontrado('Evento');
  if (evento.organizador_id !== usuario.id && usuario.rol !== 'admin') throw prohibido();
  return evento as EventoFila;
}

function editable(evento: EventoFila) {
  if (evento.estado === 'cancelado' || evento.estado === 'finalizado') {
    throw new AppError(409, 'EVENTO_CERRADO', 'Este evento ya no se puede modificar');
  }
}

const fechaFutura = z.coerce.date().refine((d) => d.getTime() > Date.now(), 'La fecha debe ser futura');

const tramoSchema = z.object({
  nombre: z.string().trim().min(2).max(60),
  descripcion: z.string().trim().max(200).nullable().optional(),
  precio_centimos: z.number().int().min(0).max(1_000_000),
  cantidad_total: z.number().int().min(1).max(200_000),
  max_por_pedido: z.number().int().min(1).max(50).default(10),
  venta_inicia_en: z.coerce.date().nullable().optional(),
  venta_termina_en: z.coerce.date().nullable().optional(),
  orden: z.number().int().min(0).default(0),
});

const eventoBase = z.object({
  titulo: z.string().trim().min(3, 'El título es muy corto').max(120),
  descripcion: z.string().trim().max(5000).default(''),
  categoria: z.enum(CATEGORIAS),
  recinto: z.string().trim().min(2, 'Indica el recinto').max(120),
  direccion: z.string().trim().max(200).nullable().optional(),
  ciudad: z.string().trim().min(2, 'Indica la ciudad').max(80),
  imagen_url: z.string().url('URL de imagen no válida').max(500).nullable().optional(),
  inicia_en: fechaFutura,
  termina_en: z.coerce.date().nullable().optional(),
  edad_minima: z.number().int().min(0).max(21).nullable().optional(),
  politica_devolucion: z.string().trim().max(1000).optional(),
});

const fechasCoherentes = (d: { inicia_en?: Date; termina_en?: Date | null }) =>
  !d.termina_en || !d.inicia_en || d.termina_en > d.inicia_en;
const ERROR_FECHAS = { message: 'La hora de fin debe ser posterior al inicio', path: ['termina_en'] };

const fechasTramo = (t: z.infer<typeof tramoSchema>) => ({
  ...t,
  venta_inicia_en: t.venta_inicia_en?.toISOString() ?? null,
  venta_termina_en: t.venta_termina_en?.toISOString() ?? null,
});

organizadorRouter.get('/eventos', async (req, res) => {
  const yo = usuarioDe(req);
  const f = query(req, paginacion.extend({ estado: z.enum(['borrador', 'publicado', 'cancelado', 'finalizado']).optional() }));
  let consulta = db
    .from('eventos')
    .select('id, titulo, categoria, recinto, ciudad, imagen_url, inicia_en, estado, destacado, tramos(cantidad_total, cantidad_vendida, precio_centimos)', { count: 'exact' })
    .eq('organizador_id', yo.id)
    .order('inicia_en', { ascending: false });
  if (f.estado) consulta = consulta.eq('estado', f.estado);
  const [desde, hasta] = rango(f);
  const { data, count, error } = await consulta.range(desde, hasta);
  if (error) throw error;

  const eventos = (data ?? []).map(({ tramos, ...e }) => {
    const lista = (tramos ?? []) as { cantidad_total: number; cantidad_vendida: number; precio_centimos: number }[];
    return {
      ...e,
      aforo: lista.reduce((a, t) => a + t.cantidad_total, 0),
      vendidas: lista.reduce((a, t) => a + t.cantidad_vendida, 0),
      ingresos_centimos: lista.reduce((a, t) => a + t.cantidad_vendida * t.precio_centimos, 0),
    };
  });
  res.json({ eventos, total: count ?? 0 });
});

organizadorRouter.post('/eventos', async (req, res) => {
  const yo = usuarioDe(req);
  const { tramos, ...datos } = body(
    req,
    eventoBase
      .extend({ tramos: z.array(tramoSchema).min(1, 'Añade al menos un tipo de entrada').max(20) })
      .refine(fechasCoherentes, ERROR_FECHAS),
  );

  const evento = ok(
    await db
      .from('eventos')
      .insert({
        ...datos,
        organizador_id: yo.id,
        inicia_en: datos.inicia_en.toISOString(),
        termina_en: datos.termina_en?.toISOString() ?? null,
      })
      .select('id')
      .single(),
  );
  const { error } = await db.from('tramos').insert(tramos.map((t, i) => ({ ...fechasTramo(t), orden: t.orden || i, evento_id: evento.id })));
  if (error) {
    await db.from('eventos').delete().eq('id', evento.id);
    throw error;
  }
  await auditar(yo.id, 'evento.crear', 'evento', evento.id, { titulo: datos.titulo });
  res.status(201).json({ evento: await detalleEvento(evento.id) });
});

async function detalleEvento(id: string) {
  const [evento, stats] = await Promise.all([
    db.from('eventos').select('*, tramos(*)').eq('id', id).single(),
    db.rpc('estadisticas_evento', { p_evento_id: id }),
  ]);
  if (evento.error) throw evento.error;
  if (stats.error) throw stats.error;
  const tramos = ((evento.data.tramos ?? []) as { orden: number }[]).sort((a, b) => a.orden - b.orden);
  return { ...evento.data, tramos, estadisticas: stats.data };
}

organizadorRouter.get('/eventos/:id', async (req, res) => {
  const { id } = params(req, idParam);
  await miEvento(usuarioDe(req), id);
  res.json({ evento: await detalleEvento(id) });
});

organizadorRouter.patch('/eventos/:id', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const evento = await miEvento(yo, id);
  editable(evento);
  const cambios = body(req, eventoBase.partial().refine(fechasCoherentes, ERROR_FECHAS));
  ok(
    await db
      .from('eventos')
      .update({
        ...cambios,
        inicia_en: cambios.inicia_en?.toISOString(),
        termina_en: cambios.termina_en === undefined ? undefined : (cambios.termina_en?.toISOString() ?? null),
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id),
  );
  await auditar(yo.id, 'evento.editar', 'evento', id, { campos: Object.keys(cambios) });
  res.json({ evento: await detalleEvento(id) });
});

organizadorRouter.delete('/eventos/:id', async (req, res) => {
  const { id } = params(req, idParam);
  const evento = await miEvento(usuarioDe(req), id);
  if (evento.estado !== 'borrador') throw new AppError(409, 'NO_BORRABLE', 'Solo se pueden borrar eventos en borrador. Cancélalo en su lugar');
  ok(await db.from('eventos').delete().eq('id', id));
  res.status(204).end();
});

organizadorRouter.post('/eventos/:id/publicar', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const evento = await miEvento(yo, id);
  if (evento.estado !== 'borrador') throw new AppError(409, 'YA_PUBLICADO', 'El evento no está en borrador');
  if (new Date(evento.inicia_en).getTime() <= Date.now()) throw new AppError(409, 'FECHA_PASADA', 'La fecha del evento ya ha pasado');
  const { count } = await db.from('tramos').select('id', { count: 'exact', head: true }).eq('evento_id', id).eq('activo', true);
  if (!count) throw new AppError(409, 'SIN_TRAMOS', 'Añade al menos un tipo de entrada antes de publicar');

  ok(await db.from('eventos').update({ estado: 'publicado', actualizado_en: new Date().toISOString() }).eq('id', id));
  await auditar(yo.id, 'evento.publicar', 'evento', id);
  res.json({ evento: await detalleEvento(id) });
});

organizadorRouter.post('/eventos/:id/despublicar', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const evento = await miEvento(yo, id);
  if (evento.estado !== 'publicado') throw new AppError(409, 'NO_PUBLICADO', 'El evento no está publicado');
  const { count } = await db.from('pedidos').select('id', { count: 'exact', head: true }).eq('evento_id', id).in('estado', ['pagado', 'pendiente']);
  if (count) throw new AppError(409, 'CON_VENTAS', 'El evento ya tiene ventas. Si no se va a celebrar, cancélalo');
  ok(await db.from('eventos').update({ estado: 'borrador', actualizado_en: new Date().toISOString() }).eq('id', id));
  res.json({ evento: await detalleEvento(id) });
});

organizadorRouter.post('/eventos/:id/cancelar', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const evento = await miEvento(yo, id);
  editable(evento);
  const { motivo } = body(req, z.object({ motivo: z.string().trim().min(5, 'Explica el motivo a los asistentes').max(300) }));
  const resultado = await cancelarEvento(id, yo.id, motivo);
  res.json(resultado);
});

// --- Tramos ----------------------------------------------------------

organizadorRouter.post('/eventos/:id/tramos', async (req, res) => {
  const { id } = params(req, idParam);
  editable(await miEvento(usuarioDe(req), id));
  const tramo = ok(await db.from('tramos').insert({ ...fechasTramo(body(req, tramoSchema)), evento_id: id }).select().single());
  res.status(201).json({ tramo });
});

const tramoParams = z.object({ id: uuid, tramoId: uuid });

organizadorRouter.patch('/eventos/:id/tramos/:tramoId', async (req, res) => {
  const { id, tramoId } = params(req, tramoParams);
  editable(await miEvento(usuarioDe(req), id));
  const cambios = body(req, tramoSchema.partial().extend({ activo: z.boolean().optional() }));

  const actual = ok(await db.from('tramos').select('cantidad_vendida, cantidad_reservada').eq('id', tramoId).eq('evento_id', id).maybeSingle());
  if (!actual) throw noEncontrado('Tipo de entrada');
  if (cambios.cantidad_total !== undefined && cambios.cantidad_total < actual.cantidad_vendida + actual.cantidad_reservada) {
    throw new AppError(409, 'CANTIDAD_INSUFICIENTE', `Ya hay ${actual.cantidad_vendida + actual.cantidad_reservada} entradas vendidas o reservadas`);
  }
  if (cambios.precio_centimos !== undefined && actual.cantidad_vendida > 0) {
    throw new AppError(409, 'PRECIO_BLOQUEADO', 'No se puede cambiar el precio de un tipo de entrada con ventas. Crea uno nuevo');
  }

  const datos: Record<string, unknown> = { ...cambios };
  if (cambios.venta_inicia_en !== undefined) datos.venta_inicia_en = cambios.venta_inicia_en?.toISOString() ?? null;
  if (cambios.venta_termina_en !== undefined) datos.venta_termina_en = cambios.venta_termina_en?.toISOString() ?? null;
  const tramo = ok(await db.from('tramos').update(datos).eq('id', tramoId).select().single());
  res.json({ tramo });
});

organizadorRouter.delete('/eventos/:id/tramos/:tramoId', async (req, res) => {
  const { id, tramoId } = params(req, tramoParams);
  editable(await miEvento(usuarioDe(req), id));
  const actual = ok(await db.from('tramos').select('cantidad_vendida, cantidad_reservada').eq('id', tramoId).eq('evento_id', id).maybeSingle());
  if (!actual) throw noEncontrado('Tipo de entrada');
  if (actual.cantidad_vendida + actual.cantidad_reservada > 0) {
    // Con ventas no se borra: se retira de la venta.
    ok(await db.from('tramos').update({ activo: false }).eq('id', tramoId));
  } else {
    ok(await db.from('tramos').delete().eq('id', tramoId));
  }
  res.status(204).end();
});

// --- Asistentes y staff ---------------------------------------------

organizadorRouter.get('/eventos/:id/asistentes', async (req, res) => {
  const { id } = params(req, idParam);
  await miEvento(usuarioDe(req), id);
  const f = query(req, paginacion.extend({ porPagina: z.coerce.number().int().min(1).max(200).default(50) }));
  const [desde, hasta] = rango(f);
  const { data, count, error } = await db
    .from('entradas')
    .select('id, codigo, estado, usada_en, creado_en, tramo:tramos(nombre), titular:usuarios!entradas_usuario_id_fkey(nombre, email)', { count: 'exact' })
    .eq('evento_id', id)
    .order('creado_en', { ascending: false })
    .range(desde, hasta);
  if (error) throw error;
  res.json({ asistentes: data, total: count ?? 0 });
});

organizadorRouter.get('/eventos/:id/staff', async (req, res) => {
  const { id } = params(req, idParam);
  await miEvento(usuarioDe(req), id);
  const staff = ok(await db.from('staff_eventos').select('creado_en, usuario:usuarios(id, nombre, email)').eq('evento_id', id));
  res.json({ staff });
});

organizadorRouter.post('/eventos/:id/staff', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  await miEvento(yo, id);
  const { email } = body(req, z.object({ email: z.string().trim().toLowerCase().email('Email no válido') }));
  const usuario = ok(await db.from('usuarios').select('id, nombre, email').eq('email', email).maybeSingle());
  if (!usuario) throw new AppError(404, 'USUARIO_NO_ENCONTRADO', 'Esa persona debe crear una cuenta en Kroos Master primero');
  ok(await db.from('staff_eventos').upsert({ evento_id: id, usuario_id: usuario.id }));
  await auditar(yo.id, 'staff.anadir', 'evento', id, { usuario_id: usuario.id });
  res.status(201).json({ usuario });
});

organizadorRouter.delete('/eventos/:id/staff/:usuarioId', async (req, res) => {
  const { id, usuarioId } = params(req, z.object({ id: uuid, usuarioId: uuid }));
  const yo = usuarioDe(req);
  await miEvento(yo, id);
  ok(await db.from('staff_eventos').delete().eq('evento_id', id).eq('usuario_id', usuarioId));
  await auditar(yo.id, 'staff.quitar', 'evento', id, { usuario_id: usuarioId });
  res.status(204).end();
});
