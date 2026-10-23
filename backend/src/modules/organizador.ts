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
  codigo_acceso: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, 'El código de preventa solo admite letras, números, - y _ (3 a 30)')
    .nullable()
    .optional(),
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
