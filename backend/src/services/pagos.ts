import type Stripe from 'stripe';
import { auditar } from '../lib/auditoria';
import { AppError, errorDesdeSql } from '../lib/errors';
import { logger } from '../lib/logger';
import { stripe } from '../lib/stripe';
import { db, ok } from '../lib/supabase';
import { notificar } from './notificaciones';

export interface Pedido {
  id: string;
  usuario_id: string;
  evento_id: string;
  estado: 'pendiente' | 'pagado' | 'expirado' | 'cancelado' | 'reembolsado';
  subtotal_centimos: number;
  descuento_centimos: number;
  gastos_centimos: number;
  seguro_centimos: number;
  es_reventa: boolean;
  total_centimos: number;
  moneda: string;
  stripe_payment_intent_id: string | null;
  expira_en: string;
  pagado_en: string | null;
  creado_en: string;
}

async function tituloEvento(eventoId: string): Promise<string> {
  const { data } = await db.from('eventos').select('titulo').eq('id', eventoId).maybeSingle();
  return data?.titulo ?? 'tu evento';
}

/**
 * Emite las entradas de un pedido pagado. Se llama desde el webhook y como
 * respaldo al consultar el pedido. Es idempotente (confirmar_pedido no
 * duplica). Si el pago llegó tarde y ya no hay stock, reembolsa.
 */
export async function confirmarPagoPedido(pedidoId: string, paymentIntentId: string | null): Promise<void> {
  const { data: emitidas, error } = await db.rpc('confirmar_pedido', {
    p_pedido_id: pedidoId,
    p_payment_intent_id: paymentIntentId,
  });

  if (error) {
    if (error.message.includes('SIN_STOCK') && paymentIntentId) {
      logger.warn({ pedidoId }, 'Pago tardío sin stock: se reembolsa');
      await stripe.refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey: `sin-stock-${pedidoId}` });
      await db.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedidoId).neq('estado', 'pagado');
      const pedido = ok(await db.from('pedidos').select('usuario_id, evento_id').eq('id', pedidoId).single());
      await notificar(pedido.usuario_id, {
        titulo: 'Entradas agotadas',
        cuerpo: `Se agotaron las entradas de ${await tituloEvento(pedido.evento_id)} mientras pagabas. Te hemos devuelto el importe.`,
        tipo: 'pedido',
        datos: { pedidoId },
      });
      return;
    }
    throw errorDesdeSql(error);
  }

  if ((emitidas as number) > 0) {
    const pedido = ok(await db.from('pedidos').select('usuario_id, evento_id, es_reventa').eq('id', pedidoId).single());
    if (pedido.es_reventa) await pagarVendedores(pedidoId);
    await notificar(pedido.usuario_id, {
      titulo: '¡Entradas listas! 🎟️',
      cuerpo: `Ya tienes ${emitidas} entrada${emitidas === 1 ? '' : 's'} para ${await tituloEvento(pedido.evento_id)}.`,
      tipo: 'pedido',
      datos: { pedidoId },
    });
  }
}

/** Reembolsa un pedido pagado en Stripe y anula sus entradas. */
export async function reembolsarPedido(pedidoId: string, actorId: string | null, motivo: string, importeCentimos?: number): Promise<void> {
  const pedido = ok(await db.from('pedidos').select('*').eq('id', pedidoId).maybeSingle()) as Pedido | null;
  if (!pedido) throw new AppError(404, 'NO_ENCONTRADO', 'Pedido no encontrado');
  if (pedido.estado === 'reembolsado') return;
  if (pedido.estado !== 'pagado') throw new AppError(409, 'PEDIDO_NO_REEMBOLSABLE', 'Solo se pueden reembolsar pedidos pagados');

  if (pedido.stripe_payment_intent_id && pedido.total_centimos > 0) {
    // Con Stripe Connect hay que deshacer también la transferencia al organizador.
    const conConnect = await tieneTransferencia(pedido);
    await stripe.refunds.create(
      {
        payment_intent: pedido.stripe_payment_intent_id,
        ...(importeCentimos !== undefined ? { amount: importeCentimos } : {}),
        ...(conConnect ? { reverse_transfer: true, refund_application_fee: true } : {}),
      },
      { idempotencyKey: `reembolso-${pedido.id}` },
    );
  }

  const { error } = await db.rpc('reembolsar_pedido', { p_pedido_id: pedido.id });
  // Puede que el webhook charge.refunded se haya adelantado.
  if (error && !error.message.includes('PEDIDO_NO_REEMBOLSABLE')) throw errorDesdeSql(error);

  const devuelto = importeCentimos ?? pedido.total_centimos;
  await auditar(actorId, 'pedido.reembolsar', 'pedido', pedido.id, { motivo, total_centimos: devuelto });
  await notificar(pedido.usuario_id, {
    titulo: 'Reembolso en camino',
    cuerpo: `Te hemos devuelto ${(devuelto / 100).toFixed(2)} € de ${await tituloEvento(pedido.evento_id)}. ${motivo}`,
    tipo: 'pedido',
    datos: { pedidoId: pedido.id },
  });
}

async function tieneTransferencia(pedido: Pedido): Promise<boolean> {
  if (!pedido.stripe_payment_intent_id) return false;
  const pi = await stripe.paymentIntents.retrieve(pedido.stripe_payment_intent_id);
  return Boolean(pi.transfer_data?.destination);
}

/** Cancela un evento y reembolsa todos sus pedidos. */
export async function cancelarEvento(eventoId: string, actorId: string, motivo: string) {
  const evento = ok(await db.from('eventos').select('id, titulo, estado').eq('id', eventoId).maybeSingle());
  if (!evento) throw new AppError(404, 'NO_ENCONTRADO', 'Evento no encontrado');
  if (evento.estado === 'cancelado') throw new AppError(409, 'YA_CANCELADO', 'El evento ya está cancelado');

  ok(await db.from('eventos').update({ estado: 'cancelado', actualizado_en: new Date().toISOString() }).eq('id', eventoId));

  // Los pendientes se liberan; los pagados se reembolsan uno a uno.
  const pendientes = ok(await db.from('pedidos').select('id, stripe_payment_intent_id').eq('evento_id', eventoId).eq('estado', 'pendiente'));
  for (const p of pendientes ?? []) {
    if (p.stripe_payment_intent_id) await stripe.paymentIntents.cancel(p.stripe_payment_intent_id).catch(() => undefined);
    await db.rpc('liberar_pedido', { p_pedido_id: p.id, p_estado: 'cancelado' });
  }

  const pagados = ok(await db.from('pedidos').select('id').eq('evento_id', eventoId).eq('estado', 'pagado'));
  let reembolsados = 0;
  const fallidos: string[] = [];
  for (const p of pagados ?? []) {
    try {
      await reembolsarPedido(p.id, actorId, `Evento cancelado: ${motivo}`);
      reembolsados++;
    } catch (err) {
      logger.error({ err, pedidoId: p.id }, 'Fallo al reembolsar pedido de evento cancelado');
      fallidos.push(p.id);
    }
  }

  await auditar(actorId, 'evento.cancelar', 'evento', eventoId, { motivo, reembolsados, fallidos });
  return { reembolsados, fallidos };
}

/** Procesa un evento de Stripe ya verificado. */
export async function procesarEventoStripe(evento: Stripe.Event): Promise<void> {
  const { data: yaProcesado } = await db.from('stripe_eventos').select('id').eq('id', evento.id).maybeSingle();
  if (yaProcesado) return;

  switch (evento.type) {
    case 'payment_intent.succeeded': {
      const pi = evento.data.object;
      const pedidoId = pi.metadata?.pedidoId;
      if (pedidoId) await confirmarPagoPedido(pedidoId, pi.id);
      break;
    }
    case 'payment_intent.canceled': {
      const pedidoId = evento.data.object.metadata?.pedidoId;
      if (pedidoId) await db.rpc('liberar_pedido', { p_pedido_id: pedidoId, p_estado: 'cancelado' });
      break;
    }
    case 'charge.refunded': {
      // Reembolso hecho desde el dashboard de Stripe: solo si es total.
      const cargo = evento.data.object;
      const piId = typeof cargo.payment_intent === 'string' ? cargo.payment_intent : cargo.payment_intent?.id;
      if (piId && cargo.amount_refunded >= cargo.amount) {
        const { data: pedido } = await db.from('pedidos').select('id, estado').eq('stripe_payment_intent_id', piId).maybeSingle();
        if (pedido?.estado === 'pagado') await db.rpc('reembolsar_pedido', { p_pedido_id: pedido.id });
      }
      break;
    }
    case 'account.updated': {
      const cuenta = evento.data.object;
      await db
        .from('usuarios')
        .update({ stripe_onboarding_completo: Boolean(cuenta.charges_enabled && cuenta.details_submitted) })
        .eq('stripe_account_id', cuenta.id);
      break;
    }
    default:
      break;
  }

  await db.from('stripe_eventos').insert({ id: evento.id, tipo: evento.type });
}

/**
 * Reventa vendida: devuelve al vendedor el precio original de su entrada
 * (reembolso parcial de su pedido). Idempotente por reventa.
 */
export async function pagarVendedores(pedidoCompradorId: string): Promise<void> {
  const reventas = ok(
    await db
      .from('reventas')
      .select('id, vendedor_id, precio_centimos, entrada:entradas(pedido_id), evento:eventos(titulo)')
      .eq('pedido_id', pedidoCompradorId)
      .eq('estado', 'vendida')
      .is('reembolso_vendedor_en', null),
  ) as unknown as { id: string; vendedor_id: string; precio_centimos: number; entrada: { pedido_id: string }; evento: { titulo: string } }[];

  for (const r of reventas) {
    try {
      const original = ok(await db.from('pedidos').select('*').eq('id', r.entrada.pedido_id).single()) as Pedido;
      if (original.stripe_payment_intent_id && r.precio_centimos > 0) {
        const conConnect = await tieneTransferencia(original);
        await stripe.refunds.create(
          {
            payment_intent: original.stripe_payment_intent_id,
            amount: r.precio_centimos,
            metadata: { reventaId: r.id },
            ...(conConnect ? { reverse_transfer: true } : {}),
          },
          { idempotencyKey: `reventa-${r.id}` },
        );
      }
      ok(await db.from('reventas').update({ reembolso_vendedor_en: new Date().toISOString() }).eq('id', r.id));
      await notificar(r.vendedor_id, {
        titulo: '¡Tu entrada se ha vendido!',
        cuerpo: `Alguien ha comprado tu entrada de ${r.evento.titulo}. Te devolvemos ${(r.precio_centimos / 100).toFixed(2)} € a tu tarjeta.`,
        tipo: 'reventa',
        datos: { reventaId: r.id },
      });
    } catch (err) {
      // Se reintenta en el siguiente job: la reventa queda sin reembolso_vendedor_en.
      logger.error({ err, reventaId: r.id }, 'No se pudo pagar al vendedor de la reventa');
    }
  }
}
