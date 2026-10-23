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
import { confirmarPagoPedido, type Pedido } from '../services/pagos';

export const pedidosRouter = Router();
pedidosRouter.use(requireAuth);

const crearSchema = z.object({
  eventoId: uuid,
  items: z
    .array(z.object({ tramoId: uuid, cantidad: z.number().int().min(1).max(50) }))
    .min(1, 'Elige al menos una entrada')
    .max(10)
    .refine((items) => new Set(items.map((i) => i.tramoId)).size === items.length, 'Tipos de entrada repetidos'),
});

const limiteCompras = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

pedidosRouter.post('/', limiteCompras, async (req, res) => {
  const yo = usuarioDe(req);
  const { eventoId, items } = body(req, crearSchema);

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
    p_items: items.map((i) => ({ tramo_id: i.tramoId, cantidad: i.cantidad })),
  });
  if (error) throw errorDesdeSql(error);
  const pedido = data as Pedido;

  // Entradas gratuitas: se emiten al momento.
  if (pedido.total_centimos === 0) {
    await confirmarPagoPedido(pedido.id, null);
    res.status(201).json({ pedido: await detallePedido(pedido.id, yo.id), clientSecret: null });
    return;
  }

  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: pedido.total_centimos,
        currency: pedido.moneda,
        automatic_payment_methods: { enabled: true },
        receipt_email: yo.email,
        description: `Kroos Master · pedido ${pedido.id.slice(0, 8)}`,
        metadata: { pedidoId: pedido.id, usuarioId: yo.id, eventoId },
        ...(await datosConnect(eventoId, pedido)),
      },
      { idempotencyKey: `pedido-${pedido.id}` },
    );
    ok(await db.from('pedidos').update({ stripe_payment_intent_id: pi.id }).eq('id', pedido.id));
    res.status(201).json({ pedido: await detallePedido(pedido.id, yo.id), clientSecret: pi.client_secret });
  } catch (err) {
    await db.rpc('liberar_pedido', { p_pedido_id: pedido.id, p_estado: 'cancelado' });
    logger.error({ err, pedidoId: pedido.id }, 'No se pudo crear el PaymentIntent');
    throw new AppError(502, 'PAGO_NO_DISPONIBLE', 'No se pudo iniciar el pago. Inténtalo de nuevo');
  }
});

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
    application_fee_amount: pedido.gastos_centimos + comision,
    transfer_data: { destination: org.stripe_account_id },
  };
}

async function detallePedido(pedidoId: string, usuarioId: string) {
  const pedido = ok(
    await db
      .from('pedidos')
      .select(
        'id, estado, subtotal_centimos, gastos_centimos, total_centimos, moneda, expira_en, pagado_en, creado_en, stripe_payment_intent_id, ' +
          'evento:eventos(id, titulo, inicia_en, recinto, ciudad, imagen_url), ' +
          'items:pedido_items(cantidad, precio_unitario_centimos, tramo:tramos(id, nombre))',
      )
      .eq('id', pedidoId)
      .eq('usuario_id', usuarioId)
      .maybeSingle(),
  ) as unknown as (Record<string, unknown> & { estado: string; stripe_payment_intent_id: string | null }) | null;
  if (!pedido) throw noEncontrado('Pedido');
  const { stripe_payment_intent_id: _pi, ...publico } = pedido;
  return publico;
}

pedidosRouter.get('/', async (req, res) => {
  const pedidos = ok(
    await db
      .from('pedidos')
      .select('id, estado, total_centimos, moneda, creado_en, pagado_en, evento:eventos(id, titulo, inicia_en, imagen_url)')
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
