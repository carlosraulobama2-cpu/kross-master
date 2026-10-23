import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AppError, errorDesdeSql, noEncontrado } from '../lib/errors';
import { logger } from '../lib/logger';
import { idParam, uuid } from '../lib/schemas';
import { stripe } from '../lib/stripe';
import { db, ok } from '../lib/supabase';
import { requireAuth, usuarioDe } from '../middleware/auth';
import { body, params } from '../middleware/validate';
import { confirmarPagoPedido, reembolsarPedido, type Pedido } from '../services/pagos';
import { urlRecibo } from './recibos';

export const pedidosRouter = Router();
pedidosRouter.use(requireAuth);

const crearSchema = z.object({
  eventoId: uuid,
  items: z
    .array(z.object({ tramoId: uuid, cantidad: z.number().int().min(1).max(50), asientos: z.array(uuid).max(50).optional() }))
    .max(10)
    .refine((items) => new Set(items.map((i) => i.tramoId)).size === items.length, 'Tipos de entrada repetidos'),
  codigo: z.string().trim().toUpperCase().max(30).optional(),
  codigoAcceso: z.string().trim().toUpperCase().max(30).optional(),
  seguro: z.boolean().default(false),
  extras: z.array(z.object({ extraId: uuid, cantidad: z.number().int().min(1).max(20) })).max(10).default([]),
}).refine((d) => d.items.length + d.extras.length > 0, 'Elige al menos una entrada o un extra');

const limiteCompras = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

pedidosRouter.post('/', limiteCompras, async (req, res) => {
  const yo = usuarioDe(req);
  const { eventoId, items, codigo, codigoAcceso, seguro, extras } = body(req, crearSchema);

  // Un pedido abierto por evento: si había otro pendiente se libera su stock.
  const abiertos = ok(
    await db.from('pedidos').select('id, stripe_payment_intent_id').eq('usuario_id', yo.id).eq('evento_id', eventoId).eq('estado', 'pendiente'),
  );
  for (const p of abiertos ?? []) {
    if (p.stripe_payment_intent_id) await stripe.paymentIntents.cancel(p.stripe_payment_intent_id).catch(() => undefined);
    await db.rpc('liberar_pedido', { p_pedido_id: p.id, p_estado: 'cancelado' });
  }

  const { data, error } = await db.rpc('reservar_pedido', {
    p_usuario_id: yo.id,
    p_evento_id: eventoId,
    p_items: items.map((i) => ({ tramo_id: i.tramoId, cantidad: i.cantidad, ...(i.asientos?.length ? { asientos: i.asientos } : {}) })),
    p_codigo: codigo || null,
    p_codigo_acceso: codigoAcceso || null,
    p_seguro: seguro,
    p_extras: extras.map((x) => ({ extra_id: x.extraId, cantidad: x.cantidad })),
  });
  if (error) throw errorDesdeSql(error);
  const pedido = data as Pedido;

  res.status(201).json(await iniciarPago(pedido, yo, eventoId));
});

/** Compra en la reventa oficial: entradas de otros fans a precio original. */
pedidosRouter.post('/reventa', limiteCompras, async (req, res) => {
  const yo = usuarioDe(req);
  const { eventoId, tramoId, cantidad, seguro } = body(
    req,
    z.object({ eventoId: uuid, tramoId: uuid, cantidad: z.number().int().min(1).max(10), seguro: z.boolean().default(false) }),
  );
  const { data, error } = await db.rpc('reservar_reventa', { p_usuario_id: yo.id, p_evento_id: eventoId, p_tramo_id: tramoId, p_cantidad: cantidad, p_seguro: seguro });
  if (error) throw errorDesdeSql(error);
  res.status(201).json(await iniciarPago(data as Pedido, yo, eventoId));
});

/** Emite al momento si es gratis; si no, crea el PaymentIntent con el importe del servidor. */
async function iniciarPago(pedido: Pedido, yo: { id: string; email: string }, eventoId: string) {
  if (pedido.total_centimos === 0) {
    await confirmarPagoPedido(pedido.id, null);
    return { pedido: await detallePedido(pedido.id, yo.id), clientSecret: null };
  }
  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: pedido.total_centimos,
        currency: pedido.moneda,
        automatic_payment_methods: { enabled: true },
        receipt_email: yo.email,
        description: `Kroos Master · pedido ${pedido.id.slice(0, 8)}${pedido.es_reventa ? ' (reventa)' : ''}`,
        metadata: { pedidoId: pedido.id, usuarioId: yo.id, eventoId },
        // En reventa el cobro se queda en la plataforma, que reembolsa al vendedor.
        ...(pedido.es_reventa ? {} : await datosConnect(eventoId, pedido)),
      },
      { idempotencyKey: `pedido-${pedido.id}` },
    );
    ok(await db.from('pedidos').update({ stripe_payment_intent_id: pi.id }).eq('id', pedido.id));
    return { pedido: await detallePedido(pedido.id, yo.id), clientSecret: pi.client_secret };
  } catch (err) {
    await db.rpc('liberar_pedido', { p_pedido_id: pedido.id, p_estado: 'cancelado' });
    logger.error({ err, pedidoId: pedido.id }, 'No se pudo crear el PaymentIntent');
    throw new AppError(502, 'PAGO_NO_DISPONIBLE', 'No se pudo iniciar el pago. Inténtalo de nuevo');
  }
}

/** Si el organizador tiene Stripe Connect, el dinero va directo a su cuenta. */
async function datosConnect(eventoId: string, pedido: Pedido) {
  const { data } = await db
    .from('eventos')
    .select('organizador:usuarios!eventos_organizador_id_fkey(stripe_account_id, stripe_onboarding_completo)')
    .eq('id', eventoId)
    .single();
  const org = data?.organizador as unknown as { stripe_account_id: string | null; stripe_onboarding_completo: boolean } | null;
  if (!org?.stripe_account_id || !org.stripe_onboarding_completo) return {};

  const { data: cfg } = await db.from('configuracion').select('comision_plataforma_porcentaje').eq('id', 1).single();
  const comision = Math.round((pedido.subtotal_centimos * Number(cfg?.comision_plataforma_porcentaje ?? 0)) / 100);
  return {
    // La plataforma se queda gastos, comisión y la protección de reembolso (la paga ella si se reclama).
    application_fee_amount: pedido.gastos_centimos + pedido.seguro_centimos + comision,
    transfer_data: { destination: org.stripe_account_id },
  };
}

async function detallePedido(pedidoId: string, usuarioId: string) {
  const pedido = ok(
    await db
      .from('pedidos')
      .select(
        'id, estado, es_reventa, canal, subtotal_centimos, descuento_centimos, extras_centimos, gastos_centimos, seguro_centimos, total_centimos, moneda, expira_en, pagado_en, creado_en, stripe_payment_intent_id, ' +
          'evento:eventos(id, titulo, categoria, inicia_en, recinto, ciudad, imagen_url, fecha_original, reembolso_aplazamiento_hasta), ' +
          'items:pedido_items(cantidad, precio_unitario_centimos, tramo:tramos(id, nombre)), reclamacion:reclamaciones_seguro(estado, respuesta, creado_en), ' +
          'extras:pedido_extras(cantidad, precio_unitario_centimos, codigo, canjeado_en, extra:extras(id, nombre, tipo)), ' +
          'asientos(seccion, fila, numero)',
      )
      .eq('id', pedidoId)
      .eq('usuario_id', usuarioId)
      .maybeSingle(),
  ) as unknown as (Record<string, unknown> & { estado: string; stripe_payment_intent_id: string | null }) | null;
  if (!pedido) throw noEncontrado('Pedido');
  const { stripe_payment_intent_id: _pi, ...publico } = pedido;
  const recibo_url = pedido.estado === 'pagado' || pedido.estado === 'reembolsado' ? urlRecibo(pedidoId) : null;
  return { ...publico, recibo_url };
}

pedidosRouter.get('/', async (req, res) => {
  const pedidos = ok(
    await db
      .from('pedidos')
      .select('id, estado, total_centimos, moneda, creado_en, pagado_en, evento:eventos(id, titulo, categoria, inicia_en, imagen_url), items:pedido_items(cantidad)')
      .eq('usuario_id', usuarioDe(req).id)
      .neq('estado', 'cancelado')
      .order('creado_en', { ascending: false })
      .limit(50),
  );
  res.json({ pedidos });
});

/**
 * La app consulta aquí tras pagar. Si el webhook aún no ha llegado pero
 * Stripe ya cobró, se confirma en este momento (respaldo).
 */
pedidosRouter.get('/:id', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const { data: base } = await db
    .from('pedidos')
    .select('estado, stripe_payment_intent_id')
    .eq('id', id)
    .eq('usuario_id', yo.id)
    .maybeSingle();
  if (!base) throw noEncontrado('Pedido');

  if (base.estado === 'pendiente' && base.stripe_payment_intent_id) {
    const pi = await stripe.paymentIntents.retrieve(base.stripe_payment_intent_id);
    if (pi.status === 'succeeded') await confirmarPagoPedido(id, pi.id);
  }
  res.json({ pedido: await detallePedido(id, yo.id) });
});

pedidosRouter.post('/:id/cancelar', async (req, res) => {
  const { id } = params(req, idParam);
  const { data: pedido } = await db
    .from('pedidos')
    .select('estado, stripe_payment_intent_id')
    .eq('id', id)
    .eq('usuario_id', usuarioDe(req).id)
    .maybeSingle();
  if (!pedido) throw noEncontrado('Pedido');
  if (pedido.estado !== 'pendiente') throw new AppError(409, 'PEDIDO_NO_CANCELABLE', 'Este pedido ya no se puede cancelar');

  if (pedido.stripe_payment_intent_id) {
    const pi = await stripe.paymentIntents.retrieve(pedido.stripe_payment_intent_id);
    if (pi.status === 'succeeded') throw new AppError(409, 'PEDIDO_PAGADO', 'El pago ya se ha completado');
    await stripe.paymentIntents.cancel(pi.id).catch(() => undefined);
  }
  await db.rpc('liberar_pedido', { p_pedido_id: id, p_estado: 'cancelado' });
  res.status(204).end();
});

/** Reclamar la protección de reembolso (antes de que empiece el evento). */
pedidosRouter.post('/:id/reclamacion', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const { motivo } = body(req, z.object({ motivo: z.string().trim().min(10, 'Cuéntanos un poco más (mínimo 10 caracteres)').max(1000) }));
  const pedido = ok(await db.from('pedidos').select('estado, seguro_centimos, evento:eventos(inicia_en)').eq('id', id).eq('usuario_id', yo.id).maybeSingle()) as unknown as {
    estado: string;
    seguro_centimos: number;
    evento: { inicia_en: string };
  } | null;
  if (!pedido) throw noEncontrado('Pedido');
  if (pedido.estado !== 'pagado' || pedido.seguro_centimos === 0) {
    throw new AppError(409, 'SIN_PROTECCION', 'Este pedido no tiene protección de reembolso');
  }
  if (new Date(pedido.evento.inicia_en).getTime() < Date.now()) {
    throw new AppError(409, 'FUERA_DE_PLAZO', 'La protección solo se puede reclamar antes de que empiece el evento');
  }
  const { data, error } = await db.from('reclamaciones_seguro').insert({ pedido_id: id, usuario_id: yo.id, motivo }).select().single();
  if (error?.code === '23505') throw new AppError(409, 'YA_RECLAMADO', 'Ya has enviado una reclamación para este pedido');
  if (error) throw error;
  res.status(201).json({ reclamacion: data });
});

/** Evento aplazado: el comprador puede pedir el reembolso dentro del plazo. */
pedidosRouter.post('/:id/reembolso-aplazamiento', async (req, res) => {
  const { id } = params(req, idParam);
  const yo = usuarioDe(req);
  const pedido = ok(
    await db.from('pedidos').select('estado, evento:eventos(reembolso_aplazamiento_hasta)').eq('id', id).eq('usuario_id', yo.id).maybeSingle(),
  ) as unknown as { estado: string; evento: { reembolso_aplazamiento_hasta: string | null } } | null;
  if (!pedido) throw noEncontrado('Pedido');
  const hasta = pedido.evento.reembolso_aplazamiento_hasta;
  if (!hasta || new Date(hasta).getTime() < Date.now()) {
    throw new AppError(409, 'FUERA_DE_PLAZO', 'Este evento no tiene un plazo de reembolso abierto');
  }
  await reembolsarPedido(id, yo.id, 'Reembolso solicitado por aplazamiento del evento.');
  res.status(204).end();
});
