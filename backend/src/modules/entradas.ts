import { Router } from 'express';
import { z } from 'zod';
import { AppError, errorDesdeSql, noEncontrado } from '../lib/errors';
import { idParam } from '../lib/schemas';
import { db, ok } from '../lib/supabase';
import { requireAuth, usuarioDe } from '../middleware/auth';
import { body, params } from '../middleware/validate';
import { notificar } from '../services/notificaciones';

export const entradasRouter = Router();
entradasRouter.use(requireAuth);

const CAMPOS_ENTRADA =
  'id, codigo, estado, usada_en, creado_en, qr_semilla, pedido_id, ' +
  'evento:eventos(id, titulo, inicia_en, termina_en, recinto, direccion, ciudad, imagen_url, estado), ' +
  'tramo:tramos(id, nombre)';

interface FilaEntrada {
  id: string;
  estado: string;
  qr_semilla: string | null;
  [k: string]: unknown;
}

/** La semilla solo viaja mientras la entrada es válida. */
const publica = (e: FilaEntrada) => ({ ...e, qr_semilla: e.estado === 'valida' ? e.qr_semilla : null });

entradasRouter.get('/', async (req, res) => {
  const yo = usuarioDe(req);
  const [entradas, pendientes] = await Promise.all([
    db.from('entradas').select(CAMPOS_ENTRADA).eq('usuario_id', yo.id).order('creado_en', { ascending: false }),
    db.from('transferencias').select('entrada_id').eq('de_usuario_id', yo.id).eq('estado', 'pendiente'),
  ]);
  if (entradas.error) throw entradas.error;
  const enTransferencia = new Set((pendientes.data ?? []).map((t) => t.entrada_id));
  res.json({
    entradas: (entradas.data as unknown as FilaEntrada[]).map((e) => ({ ...publica(e), transferenciaPendiente: enTransferencia.has(e.id) })),
  });
});

entradasRouter.get('/:id', async (req, res) => {
  const { id } = params(req, idParam);
  const entrada = ok(await db.from('entradas').select(CAMPOS_ENTRADA).eq('id', id).eq('usuario_id', usuarioDe(req).id).maybeSingle());
  if (!entrada) throw noEncontrado('Entrada');
  res.json({ entrada: publica(entrada as unknown as FilaEntrada) });
});

entradasRouter.post('/:id/transferir', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const { email } = body(req, z.object({ email: z.string().trim().toLowerCase().email('Email no válido') }));

  const entrada = ok(
    await db.from('entradas').select('id, estado, evento:eventos(titulo, inicia_en)').eq('id', id).eq('usuario_id', yo.id).maybeSingle(),
  ) as unknown as { id: string; estado: string; evento: { titulo: string; inicia_en: string } } | null;
  if (!entrada) throw noEncontrado('Entrada');
  if (entrada.estado !== 'valida') throw new AppError(409, 'ENTRADA_NO_TRANSFERIBLE', 'Esta entrada ya no se puede transferir');
  if (new Date(entrada.evento.inicia_en).getTime() < Date.now()) {
    throw new AppError(409, 'ENTRADA_NO_TRANSFERIBLE', 'No se pueden transferir entradas de eventos que ya han empezado');
  }

  const destino = ok(await db.from('usuarios').select('id, bloqueado').eq('email', email).maybeSingle());
  if (!destino || destino.bloqueado) {
    throw new AppError(404, 'DESTINATARIO_NO_ENCONTRADO', 'No hay ninguna cuenta con ese email. Pídele que se registre primero');
  }
  if (destino.id === yo.id) throw new AppError(400, 'DESTINATARIO_INVALIDO', 'No puedes transferirte una entrada a ti mismo');

  const { data: transferencia, error } = await db
    .from('transferencias')
    .insert({ entrada_id: id, de_usuario_id: yo.id, a_usuario_id: destino.id })
    .select('id, estado, creado_en')
    .single();
  if (error) {
    if (error.code === '23505') throw new AppError(409, 'TRANSFERENCIA_PENDIENTE', 'Ya hay una transferencia pendiente para esta entrada');
    throw error;
  }

  await notificar(destino.id, {
    titulo: 'Te han enviado una entrada',
    cuerpo: `${yo.nombre || 'Alguien'} quiere enviarte una entrada para ${entrada.evento.titulo}.`,
    tipo: 'transferencia',
    datos: { transferenciaId: transferencia.id },
  });
  res.status(201).json({ transferencia });
});

export const transferenciasRouter = Router();
transferenciasRouter.use(requireAuth);

transferenciasRouter.get('/', async (req, res) => {
  const yo = usuarioDe(req);
  const campos =
    'id, estado, creado_en, entrada:entradas(id, tramo:tramos(nombre), evento:eventos(id, titulo, inicia_en, imagen_url)), ' +
    'de:usuarios!transferencias_de_usuario_id_fkey(nombre, email), a:usuarios!transferencias_a_usuario_id_fkey(nombre, email)';
  const [recibidas, enviadas] = await Promise.all([
    db.from('transferencias').select(campos).eq('a_usuario_id', yo.id).eq('estado', 'pendiente').order('creado_en', { ascending: false }),
    db.from('transferencias').select(campos).eq('de_usuario_id', yo.id).eq('estado', 'pendiente').order('creado_en', { ascending: false }),
  ]);
  if (recibidas.error) throw recibidas.error;
  if (enviadas.error) throw enviadas.error;
  res.json({ recibidas: recibidas.data, enviadas: enviadas.data });
});

transferenciasRouter.post('/:id/aceptar', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const { data: entradaId, error } = await db.rpc('aceptar_transferencia', { p_transferencia_id: id, p_usuario_id: yo.id });
  if (error) throw errorDesdeSql(error);

  const { data: t } = await db.from('transferencias').select('de_usuario_id').eq('id', id).single();
  if (t) {
    await notificar(t.de_usuario_id, {
      titulo: 'Transferencia completada',
      cuerpo: `${yo.nombre || yo.email} ha aceptado tu entrada.`,
      tipo: 'transferencia',
    });
  }
  res.json({ entradaId });
});

async function resolver(id: string, usuarioId: string, como: 'de_usuario_id' | 'a_usuario_id', estado: 'cancelada' | 'rechazada') {
  const { data, error } = await db
    .from('transferencias')
    .update({ estado, resuelta_en: new Date().toISOString() })
    .eq('id', id)
    .eq(como, usuarioId)
    .eq('estado', 'pendiente')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(409, 'TRANSFERENCIA_NO_DISPONIBLE', 'La transferencia ya no está disponible');
}

transferenciasRouter.post('/:id/rechazar', async (req, res) => {
  const { id } = params(req, idParam);
  await resolver(id, usuarioDe(req).id, 'a_usuario_id', 'rechazada');
  res.status(204).end();
});

transferenciasRouter.post('/:id/cancelar', async (req, res) => {
  const { id } = params(req, idParam);
  await resolver(id, usuarioDe(req).id, 'de_usuario_id', 'cancelada');
  res.status(204).end();
});
