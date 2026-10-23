import { Router } from 'express';
import { z } from 'zod';
import { auditar } from '../lib/auditoria';
import { AppError, noEncontrado, prohibido } from '../lib/errors';
import { CATEGORIAS, idParam, paginacion, rango, uuid } from '../lib/schemas';
import { db, ok } from '../lib/supabase';
import { requireAuth, requireRol, usuarioDe } from '../middleware/auth';
import { body, params, query } from '../middleware/validate';
import { fijarArtistas, recintoPara, seguidoresDeEvento } from '../services/catalogo';
import { notificar } from '../services/notificaciones';
import { firmarEnlace } from '../lib/firma';
import { errorDesdeSql } from '../lib/errors';
import { cancelarEvento, confirmarPagoPedido } from '../services/pagos';
import { env } from '../config/env';
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
  codigo_acceso: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, 'El código de preventa solo admite letras, números, - y _ (3 a 30)')
    .nullable()
    .optional(),
  accesible: z.boolean().optional(),
  incluye_acompanante: z.boolean().optional(),
  // Fase automática: abre cuando se agota este otro tipo de entrada.
  fase_anterior_id: uuid.nullable().optional(),
});

const textoInfo = z.string().trim().max(1000).nullable().optional();

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
  puertas_abren_en: z.coerce.date().nullable().optional(),
  max_por_usuario: z.number().int().min(1).max(100).nullable().optional(),
  cola_activa: z.boolean().optional(),
  cola_ritmo: z.number().int().min(1).max(10000).optional(),
  registro_fan_activo: z.boolean().optional(),
  cupo_invitaciones: z.number().int().min(0).max(10_000).optional(),
  artistas: z.array(z.string().trim().min(2).max(80)).max(20).optional(),
  // Información práctica del recinto (se guarda en el recinto, no en el evento).
  como_llegar: textoInfo,
  parking: textoInfo,
  accesibilidad: textoInfo,
  objetos_prohibidos: textoInfo,
});

/** Separa los campos del evento de los del recinto y los artistas. */
async function prepararEvento(
  datos: Partial<z.infer<typeof eventoBase>>,
  usuario: UsuarioSesion,
  actual?: { recinto: string; ciudad: string; direccion: string | null },
) {
  const { artistas, como_llegar, parking, accesibilidad, objetos_prohibidos, inicia_en, termina_en, puertas_abren_en, ...resto } = datos;
  const fila: Record<string, unknown> = { ...resto };
  if (inicia_en !== undefined) fila.inicia_en = inicia_en.toISOString();
  if (termina_en !== undefined) fila.termina_en = termina_en?.toISOString() ?? null;
  if (puertas_abren_en !== undefined) fila.puertas_abren_en = puertas_abren_en?.toISOString() ?? null;

  const info = { como_llegar, parking, accesibilidad, objetos_prohibidos };
  const tocaRecinto = datos.recinto !== undefined || datos.ciudad !== undefined || datos.direccion !== undefined || Object.values(info).some((v) => v !== undefined);
  if (tocaRecinto) {
    fila.recinto_id = await recintoPara(
      {
        nombre: datos.recinto ?? actual?.recinto ?? '',
        ciudad: datos.ciudad ?? actual?.ciudad ?? '',
        direccion: datos.direccion !== undefined ? datos.direccion : actual?.direccion,
        ...info,
      },
      usuario.id,
      usuario.rol === 'admin',
    );
  }
  return { fila, artistas };
}

const fechasCoherentes = (d: { inicia_en?: Date; termina_en?: Date | null }) =>
  !d.termina_en || !d.inicia_en || d.termina_en > d.inicia_en;
const ERROR_FECHAS = { message: 'La hora de fin debe ser posterior al inicio', path: ['termina_en'] };

// En inserciones múltiples PostgREST pone null en las claves que faltan: se dan todos los valores.
const fechasTramo = (t: z.infer<typeof tramoSchema>) => ({
  ...t,
  accesible: t.accesible ?? false,
  incluye_acompanante: t.incluye_acompanante ?? false,
  codigo_acceso: t.codigo_acceso ?? null,
  fase_anterior_id: t.fase_anterior_id ?? null,
  descripcion: t.descripcion ?? null,
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

  const { fila, artistas } = await prepararEvento(datos, yo);
  const evento = ok(await db.from('eventos').insert({ ...fila, organizador_id: yo.id }).select('id').single());
  if (artistas) await fijarArtistas(evento.id, artistas, yo.id);
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
    db
      .from('eventos')
      .select('*, tramos(*), recinto_info:recintos(id, nombre, como_llegar, parking, accesibilidad, objetos_prohibidos), evento_artistas(orden, artista:artistas(id, nombre))')
      .eq('id', id)
      .single(),
    db.rpc('estadisticas_evento', { p_evento_id: id }),
  ]);
  if (evento.error) throw evento.error;
  if (stats.error) throw stats.error;
  type Relacion = { orden: number; artista: { id: string; nombre: string } };
  const { evento_artistas, ...resto } = evento.data as Record<string, unknown> & { evento_artistas: Relacion[]; tramos: { orden: number }[] };
  const tramos = ((resto.tramos ?? []) as { orden: number }[]).sort((a, b) => a.orden - b.orden);
  const artistas = (evento_artistas ?? []).sort((a: Relacion, b: Relacion) => a.orden - b.orden).map((a: Relacion) => a.artista);
  return { ...resto, tramos, artistas, estadisticas: stats.data };
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
  const actual = ok(await db.from('eventos').select('recinto, ciudad, direccion').eq('id', id).single());
  const { fila, artistas } = await prepararEvento(cambios, yo, actual);
  ok(await db.from('eventos').update({ ...fila, actualizado_en: new Date().toISOString() }).eq('id', id));
  if (artistas) await fijarArtistas(id, artistas, yo.id);
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
  // Aviso a quien sigue a sus artistas o al recinto (sin bloquear la respuesta).
  void seguidoresDeEvento(id).then((ids) =>
    notificar(ids, { titulo: 'Nueva fecha a la venta', cuerpo: `${evento.titulo} ya tiene entradas. ¡Que no te lo cuenten!`, tipo: 'novedad', datos: { eventoId: id } }),
  );
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
  if (cambios.fase_anterior_id === tramoId) throw new AppError(400, 'FASE_INVALIDA', 'Un tipo de entrada no puede ser su propia fase anterior');

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

// --- Códigos promocionales -------------------------------------------

const codigoSchema = z
  .object({
    codigo: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Solo letras, números, - y _ (3 a 30)'),
    descripcion: z.string().trim().max(120).nullable().optional(),
    tipo: z.enum(['porcentaje', 'fijo']),
    valor: z.number().int().min(1),
    usos_max: z.number().int().min(1).nullable().optional(),
    tramo_ids: z.array(uuid).max(20).nullable().optional(),
    valido_desde: z.coerce.date().nullable().optional(),
    valido_hasta: z.coerce.date().nullable().optional(),
  })
  .refine((c) => c.tipo !== 'porcentaje' || c.valor <= 100, { message: 'El porcentaje no puede superar el 100 %', path: ['valor'] });

organizadorRouter.get('/eventos/:id/codigos', async (req, res) => {
  const { id } = params(req, idParam);
  await miEvento(usuarioDe(req), id);
  res.json({ codigos: ok(await db.from('codigos_promocionales').select('*').eq('evento_id', id).order('creado_en', { ascending: false })) });
});

organizadorRouter.post('/eventos/:id/codigos', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  editable(await miEvento(yo, id));
  const c = body(req, codigoSchema);
  const { data, error } = await db
    .from('codigos_promocionales')
    .insert({ ...c, evento_id: id, valido_desde: c.valido_desde?.toISOString() ?? null, valido_hasta: c.valido_hasta?.toISOString() ?? null })
    .select()
    .single();
  if (error?.code === '23505') throw new AppError(409, 'CODIGO_DUPLICADO', 'Ya existe un código con ese nombre en este evento');
  if (error) throw error;
  await auditar(yo.id, 'codigo.crear', 'evento', id, { codigo: c.codigo, tipo: c.tipo, valor: c.valor });
  res.status(201).json({ codigo: data });
});

organizadorRouter.patch('/eventos/:id/codigos/:codigoId', async (req, res) => {
  const { id, codigoId } = params(req, z.object({ id: uuid, codigoId: uuid }));
  await miEvento(usuarioDe(req), id);
  const { activo } = body(req, z.object({ activo: z.boolean() }));
  const codigo = ok(await db.from('codigos_promocionales').update({ activo }).eq('id', codigoId).eq('evento_id', id).select().maybeSingle());
  if (!codigo) throw noEncontrado('Código');
  res.json({ codigo });
});

organizadorRouter.delete('/eventos/:id/codigos/:codigoId', async (req, res) => {
  const { id, codigoId } = params(req, z.object({ id: uuid, codigoId: uuid }));
  await miEvento(usuarioDe(req), id);
  const { data: usado } = await db.from('pedidos').select('id').eq('codigo_promocional_id', codigoId).limit(1).maybeSingle();
  // Si ya se usó, se desactiva para conservar el histórico de pedidos.
  if (usado) ok(await db.from('codigos_promocionales').update({ activo: false }).eq('id', codigoId));
  else ok(await db.from('codigos_promocionales').delete().eq('id', codigoId).eq('evento_id', id));
  res.status(204).end();
});

// --- Fans verificados: inscritos y sorteo ---------------------------

organizadorRouter.get('/eventos/:id/fans', async (req, res) => {
  const { id } = params(req, idParam);
  await miEvento(usuarioDe(req), id);
  const filas = ok(await db.from('registros_fan').select('estado').eq('evento_id', id));
  const conteo = { inscrito: 0, seleccionado: 0, no_seleccionado: 0 } as Record<string, number>;
  for (const f of filas ?? []) conteo[f.estado] = (conteo[f.estado] ?? 0) + 1;
  res.json({ fans: conteo });
});

/** Sortea las plazas de preventa entre los inscritos y avisa a todos. */
organizadorRouter.post('/eventos/:id/sorteo', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const evento = await miEvento(yo, id);
  editable(evento);
  const { plazas } = body(req, z.object({ plazas: z.number().int().min(1).max(100_000) }));
  const { count } = await db.from('registros_fan').select('usuario_id', { count: 'exact', head: true }).eq('evento_id', id).eq('estado', 'inscrito');
  if (!count) throw new AppError(409, 'SIN_INSCRITOS', 'No hay fans inscritos pendientes de sorteo');

  const { data: elegidos, error } = await db.rpc('sortear_fans', { p_evento_id: id, p_plazas: plazas });
  if (error) throw error;
  const ids = (elegidos as string[]) ?? [];
  const { data: resto } = await db.from('registros_fan').select('usuario_id').eq('evento_id', id).eq('estado', 'no_seleccionado');
  ok(await db.from('eventos').update({ registro_fan_activo: false }).eq('id', id));

  await notificar(ids, {
    titulo: '¡Has sido seleccionado! 🎉',
    cuerpo: `Ya puedes comprar en la preventa de ${evento.titulo}. Abre el evento: verás las entradas reservadas para fans.`,
    tipo: 'fan',
    datos: { eventoId: id },
  });
  await notificar(
    (resto ?? []).map((r) => r.usuario_id).filter((u) => !ids.includes(u)),
    { titulo: 'Sorteo de preventa', cuerpo: `Esta vez no ha habido suerte en la preventa de ${evento.titulo}. Te avisaremos de la venta general.`, tipo: 'fan', datos: { eventoId: id } },
  );
  await auditar(yo.id, 'evento.sorteo_fans', 'evento', id, { plazas, seleccionados: ids.length });
  res.json({ seleccionados: ids.length, no_seleccionados: (resto ?? []).length });
});

// --- Plano de butacas -------------------------------------------------

organizadorRouter.post('/eventos/:id/tramos/:tramoId/plano', async (req, res) => {
  const { id, tramoId } = params(req, tramoParams);
  const yo = usuarioDe(req);
  editable(await miEvento(yo, id));
  const { filas, porFila, seccion } = body(
    req,
    z.object({ filas: z.number().int().min(1).max(60), porFila: z.number().int().min(1).max(100), seccion: z.string().trim().max(40).default('') }),
  );
  const tramo = ok(await db.from('tramos').select('id').eq('id', tramoId).eq('evento_id', id).maybeSingle());
  if (!tramo) throw noEncontrado('Tipo de entrada');
  const { data, error } = await db.rpc('generar_asientos', { p_tramo_id: tramoId, p_filas: filas, p_por_fila: porFila, p_seccion: seccion });
  if (error) throw errorDesdeSql(error);
  await auditar(yo.id, 'tramo.plano', 'evento', id, { tramo_id: tramoId, filas, porFila });
  res.json({ asientos: data as number });
});

// --- Extras: parking, merch, VIP… ------------------------------------

const extraSchema = z.object({
  nombre: z.string().trim().min(2).max(60),
  descripcion: z.string().trim().max(200).nullable().optional(),
  tipo: z.enum(['parking', 'merch', 'vip', 'comida', 'otro']).default('otro'),
  precio_centimos: z.number().int().min(0).max(1_000_000),
  stock_total: z.number().int().min(1).max(100_000),
  max_por_pedido: z.number().int().min(1).max(20).default(4),
});

organizadorRouter.get('/eventos/:id/extras', async (req, res) => {
  const { id } = params(req, idParam);
  await miEvento(usuarioDe(req), id);
  res.json({ extras: ok(await db.from('extras').select('*').eq('evento_id', id).order('creado_en')) });
});

organizadorRouter.post('/eventos/:id/extras', async (req, res) => {
  const { id } = params(req, idParam);
  editable(await miEvento(usuarioDe(req), id));
  const x = body(req, extraSchema);
  const extra = ok(await db.from('extras').insert({ ...x, descripcion: x.descripcion ?? null, evento_id: id }).select().single());
  res.status(201).json({ extra });
});

organizadorRouter.patch('/eventos/:id/extras/:extraId', async (req, res) => {
  const { id, extraId } = params(req, z.object({ id: uuid, extraId: uuid }));
  editable(await miEvento(usuarioDe(req), id));
  const cambios = body(req, extraSchema.partial().extend({ activo: z.boolean().optional() }));
  const actual = ok(await db.from('extras').select('stock_vendido, stock_reservado').eq('id', extraId).eq('evento_id', id).maybeSingle());
  if (!actual) throw noEncontrado('Extra');
  if (cambios.stock_total !== undefined && cambios.stock_total < actual.stock_vendido + actual.stock_reservado) {
    throw new AppError(409, 'CANTIDAD_INSUFICIENTE', `Ya hay ${actual.stock_vendido + actual.stock_reservado} vendidos o reservados`);
  }
  const extra = ok(await db.from('extras').update(cambios).eq('id', extraId).select().single());
  res.json({ extra });
});

organizadorRouter.delete('/eventos/:id/extras/:extraId', async (req, res) => {
  const { id, extraId } = params(req, z.object({ id: uuid, extraId: uuid }));
  await miEvento(usuarioDe(req), id);
  const { data: vendido } = await db.from('pedido_extras').select('pedido_id').eq('extra_id', extraId).limit(1).maybeSingle();
  if (vendido) ok(await db.from('extras').update({ activo: false }).eq('id', extraId));
  else ok(await db.from('extras').delete().eq('id', extraId).eq('evento_id', id));
  res.status(204).end();
});

// --- Invitaciones y taquilla ------------------------------------------

const itemsEmision = z
  .array(z.object({ tramoId: uuid, cantidad: z.number().int().min(1).max(50), asientos: z.array(uuid).max(50).optional() }))
  .min(1, 'Elige al menos una entrada')
  .max(10);

/** Reserva y emite al momento un pedido sin pasar por Stripe. */
async function emitirDirecto(opts: {
  usuarioId: string;
  eventoId: string;
  items: z.infer<typeof itemsEmision>;
  extras?: { extraId: string; cantidad: number }[];
  canal: 'taquilla' | 'invitacion';
  vendidoPor: string;
  metodoPago: 'efectivo' | 'tarjeta' | 'bizum' | 'gratis';
  titular?: string | null;
}) {
  const { data, error } = await db.rpc('reservar_pedido', {
    p_usuario_id: opts.usuarioId,
    p_evento_id: opts.eventoId,
    p_items: opts.items.map((i) => ({ tramo_id: i.tramoId, cantidad: i.cantidad, ...(i.asientos?.length ? { asientos: i.asientos } : {}) })),
    p_codigo: null,
    p_codigo_acceso: null,
    p_seguro: false,
    p_extras: (opts.extras ?? []).map((x) => ({ extra_id: x.extraId, cantidad: x.cantidad })),
    p_canal: opts.canal,
    p_vendido_por: opts.vendidoPor,
  });
  if (error) throw errorDesdeSql(error);
  const pedido = data as { id: string; total_centimos: number };
  ok(await db.from('pedidos').update({ metodo_pago: opts.metodoPago }).eq('id', pedido.id));
  await confirmarPagoPedido(pedido.id, null);
  if (opts.titular) ok(await db.from('entradas').update({ titular_nombre: opts.titular }).eq('pedido_id', pedido.id));
  return pedido;
}

/** Invitaciones (comps): gratis, dentro del cupo del evento, a una cuenta existente. */
organizadorRouter.post('/eventos/:id/invitaciones', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const evento = await miEvento(yo, id);
  editable(evento);
  const { email, items, nota } = body(
    req,
    z.object({ email: z.string().trim().toLowerCase().email('Email no válido'), items: itemsEmision, nota: z.string().trim().max(200).optional() }),
  );
  const invitado = ok(await db.from('usuarios').select('id, nombre').eq('email', email).maybeSingle());
  if (!invitado) throw new AppError(404, 'USUARIO_NO_ENCONTRADO', 'Esa persona debe crear una cuenta en Kroos Master primero');
  const pedido = await emitirDirecto({ usuarioId: invitado.id, eventoId: id, items, canal: 'invitacion', vendidoPor: yo.id, metodoPago: 'gratis', titular: invitado.nombre });
  await notificar(invitado.id, {
    titulo: 'Tienes una invitación 🎁',
    cuerpo: `Te han invitado a ${evento.titulo}.${nota ? ` «${nota}»` : ''} Ya la tienes en Mis entradas.`,
    tipo: 'pedido',
    datos: { pedidoId: pedido.id },
  });
  await auditar(yo.id, 'evento.invitacion', 'evento', id, { usuario_id: invitado.id, pedido_id: pedido.id });
  res.status(201).json({ pedidoId: pedido.id });
});

organizadorRouter.get('/eventos/:id/invitaciones', async (req, res) => {
  const { id } = params(req, idParam);
  await miEvento(usuarioDe(req), id);
  const [ev, pedidos] = await Promise.all([
    db.from('eventos').select('cupo_invitaciones').eq('id', id).single(),
    db
      .from('pedidos')
      .select('id, creado_en, estado, usuario:usuarios!pedidos_usuario_id_fkey(nombre, email), entradas(id, estado, es_acompanante)')
      .eq('evento_id', id)
      .eq('canal', 'invitacion')
      .eq('estado', 'pagado')
      .order('creado_en', { ascending: false }),
  ]);
  if (ev.error) throw ev.error;
  if (pedidos.error) throw pedidos.error;
  type P = { entradas: { estado: string; es_acompanante: boolean }[] };
  const usadas = (pedidos.data as unknown as P[]).reduce(
    (n, p) => n + p.entradas.filter((e) => !e.es_acompanante && (e.estado === 'valida' || e.estado === 'usada')).length,
    0,
  );
  res.json({ cupo: ev.data.cupo_invitaciones, usadas, invitaciones: pedidos.data });
});

/** Venta en taquilla desde el móvil del organizador o su staff: efectivo, datáfono o Bizum. */
organizadorRouter.post('/eventos/:id/taquilla', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  editable(await miEvento(yo, id));
  const d = body(
    req,
    z.object({
      items: itemsEmision,
      extras: z.array(z.object({ extraId: uuid, cantidad: z.number().int().min(1).max(20) })).max(10).default([]),
      metodoPago: z.enum(['efectivo', 'tarjeta', 'bizum']),
      titular: z.string().trim().max(80).optional(),
      email: z.string().trim().toLowerCase().email('Email no válido').optional(),
      validarYa: z.boolean().default(false),
    }),
  );
  // Si da su email y tiene cuenta, las entradas van a su cuenta; si no, a la del vendedor.
  const comprador = d.email ? ok(await db.from('usuarios').select('id, nombre').eq('email', d.email).maybeSingle()) : null;
  const pedido = await emitirDirecto({
    usuarioId: comprador?.id ?? yo.id,
    eventoId: id,
    items: d.items,
    extras: d.extras,
    canal: 'taquilla',
    vendidoPor: yo.id,
    metodoPago: d.metodoPago,
    titular: d.titular || comprador?.nombre || 'Venta en taquilla',
  });
  if (d.validarYa) {
    ok(await db.from('entradas').update({ estado: 'usada', usada_en: new Date().toISOString(), validada_por: yo.id }).eq('pedido_id', pedido.id).eq('estado', 'valida'));
  }
  const entradas = ok(await db.from('entradas').select('id, codigo, estado, tramo:tramos(nombre), asiento:asientos!entradas_asiento_id_fkey(fila, numero)').eq('pedido_id', pedido.id));
  await auditar(yo.id, 'evento.taquilla', 'evento', id, { pedido_id: pedido.id, total: pedido.total_centimos, metodo: d.metodoPago });
  res.status(201).json({ pedidoId: pedido.id, total_centimos: pedido.total_centimos, entradas, enCuentaDe: comprador ? 'comprador' : 'vendedor' });
});

// --- Exportar asistentes (CSV) ----------------------------------------

/** Devuelve un enlace firmado (10 min) para descargar el CSV sin sesión. */
organizadorRouter.post('/eventos/:id/exportar', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  await miEvento(yo, id);
  await auditar(yo.id, 'evento.exportar', 'evento', id);
  res.json({ url: `${env.PUBLIC_API_URL ?? ''}/api/exportes/${id}.csv?t=${firmarEnlace(`csv:${id}`, 10)}` });
});

// --- Aplazar evento -----------------------------------------------------

organizadorRouter.post('/eventos/:id/aplazar', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const evento = await miEvento(yo, id);
  editable(evento);
  const d = body(
    req,
    z
      .object({
        inicia_en: fechaFutura,
        termina_en: z.coerce.date().nullable().optional(),
        dias_reembolso: z.number().int().min(1).max(60).default(14),
        motivo: z.string().trim().min(5, 'Explica el motivo a los asistentes').max(300),
      })
      .refine(fechasCoherentes, ERROR_FECHAS),
  );
  const actual = ok(await db.from('eventos').select('inicia_en, termina_en, puertas_abren_en, fecha_original').eq('id', id).single());
  const desplazamiento = d.inicia_en.getTime() - new Date(actual.inicia_en).getTime();
  const mover = (f: string | null) => (f ? new Date(new Date(f).getTime() + desplazamiento).toISOString() : null);
  const hasta = new Date(Date.now() + d.dias_reembolso * 86_400_000).toISOString();
  ok(
    await db
      .from('eventos')
      .update({
        inicia_en: d.inicia_en.toISOString(),
        termina_en: d.termina_en !== undefined ? (d.termina_en?.toISOString() ?? null) : mover(actual.termina_en),
        puertas_abren_en: mover(actual.puertas_abren_en),
        fecha_original: actual.fecha_original ?? actual.inicia_en,
        reembolso_aplazamiento_hasta: hasta,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id),
  );
  // Los recordatorios de la fecha antigua ya no valen.
  await db.from('recordatorios_enviados').delete().eq('evento_id', id);

  const titulares = ok(await db.from('pedidos').select('usuario_id').eq('evento_id', id).eq('estado', 'pagado'));
  const fecha = d.inicia_en.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' });
  await notificar(
    (titulares ?? []).map((t) => t.usuario_id),
    {
      titulo: `${evento.titulo} se aplaza`,
      cuerpo: `Nueva fecha: ${fecha}. Tus entradas siguen valiendo. Si no puedes ir, pide el reembolso desde tu pedido antes del ${new Date(hasta).toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' })}. Motivo: ${d.motivo}`,
      tipo: 'evento',
      datos: { eventoId: id },
    },
  );
  await auditar(yo.id, 'evento.aplazar', 'evento', id, { de: actual.inicia_en, a: d.inicia_en.toISOString(), motivo: d.motivo });
  res.json({ evento: await detalleEvento(id) });
});
