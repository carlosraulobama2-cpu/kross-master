import express from 'express';
import type Stripe from 'stripe';
import { env } from '../../config/env';
import { stripe } from '../../config/stripe';
import { paymentsService } from './payments.controller';

/**
 * Webhook de Stripe. Se monta ANTES de express.json(): la firma se calcula sobre el cuerpo en bruto.
 * Responde 500 si la emisión falla, para que Stripe lo reintente (la emisión es idempotente).
 */
const router = express.Router();

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!env.stripeWebhookSecret) return res.status(500).send('Webhook secret no configurado');
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, env.stripeWebhookSecret);
  } catch {
    return res.status(400).send('Firma del webhook inválida');
  }
  try {
    const result = await paymentsService.procesarEvento(event);
    res.json({ received: true, result });
  } catch (error) {
    console.error('Error procesando webhook de Stripe', event.id, error);
    res.status(500).json({ received: false });
  }
});

export default router;
