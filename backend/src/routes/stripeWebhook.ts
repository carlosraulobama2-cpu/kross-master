import express from 'express';
import Stripe from 'stripe';
import { supabase } from '../config/supabase';
import { buildQrPayload } from '../utils/qrSigner';

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('STRIPE_WEBHOOK_SECRET no configurado');
    return res.status(400).send('Webhook secret no configurado');
  }

  let event: Stripe.Event;

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2025-02-24.acacia',
    });
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).send(`Webhook Error: ${(error as Error).message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { eventoId, usuarioId, asiento } = paymentIntent.metadata;

    if (!eventoId || !usuarioId) {
      console.warn('payment_intent.succeeded sin metadata completa');
      return res.status(200).send('OK');
    }

    const { data: evento, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', eventoId)
      .single();

    if (error || !evento) {
      console.error('Evento no encontrado en webhook');
      return res.status(200).send('OK');
    }

    const ticketId = `TK-${Math.floor(Math.random() * 9000) + 1000}`;
    const eventId = `EV-2026-${evento.id}`;
    const codigoQr = buildQrPayload({ ticketId, eventId, seat: asiento || 'A-12' });

    const { data: entrada, error: entradaError } = await supabase
      .from('entradas')
      .insert([{
        evento_id: evento.id,
        usuario_id: usuarioId,
        codigo_qr: codigoQr,
        asiento: asiento || 'A-12',
        precio_pagado: evento.precio,
        estado: 'VALIDO',
        payment_intent_id: paymentIntent.id,
        stripe_status: 'succeeded',
      }])
      .select()
      .single();

    if (entradaError) {
      console.error('Error creando entrada en webhook:', entradaError);
    } else {
      await supabase
        .from('eventos')
        .update({ entradas_disponibles: (evento.entradas_disponibles || 0) - 1 })
        .eq('id', evento.id);
    }
  }

  res.status(200).send('OK');
});

export default router;
