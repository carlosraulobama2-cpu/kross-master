import express, { Router } from 'express';
import type Stripe from 'stripe';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { stripe } from '../lib/stripe';
import { procesarEventoStripe } from '../services/pagos';

export const webhooksRouter = Router();

// Stripe firma el cuerpo exacto: se monta ANTES de express.json().
webhooksRouter.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let evento: Stripe.Event;
  try {
    evento = stripe.webhooks.constructEvent(req.body as Buffer, req.headers['stripe-signature'] as string, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.warn({ err }, 'Firma de webhook de Stripe inválida');
    res.status(400).send('Firma inválida');
    return;
  }

  try {
    await procesarEventoStripe(evento);
    res.json({ recibido: true });
  } catch (err) {
    // 500 → Stripe reintentará; el proceso es idempotente.
    logger.error({ err, tipo: evento.type, id: evento.id }, 'Error procesando webhook');
    res.status(500).json({ recibido: false });
  }
});
