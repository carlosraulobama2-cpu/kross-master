import { Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { supabase } from '../config/supabase';
import { buildQrPayload } from '../utils/qrSigner';

async function crearIntentoPago(req: Request, res: Response) {
  try {
    const { monto, eventoId, usuarioId } = req.body;

    const { data: evento, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', eventoId)
      .single();

    if (error || !evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    if (evento.entradas_disponibles <= 0) {
      return res.status(409).json({ error: 'No hay entradas disponibles' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(monto) * 100),
      currency: 'eur',
      metadata: { eventoId, usuarioId },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

async function confirmarPago(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { paymentIntentId, eventoId, asiento } = req.body;

    const { data: evento, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', eventoId)
      .single();

    if (error || !evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
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
        payment_intent_id: paymentIntentId,
        stripe_status: 'succeeded',
      }])
      .select()
      .single();

    if (entradaError) throw entradaError;

    await supabase
      .from('eventos')
      .update({ entradas_disponibles: (evento.entradas_disponibles || 0) - 1 })
      .eq('id', evento.id);

    res.json({ entrada });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export { crearIntentoPago, confirmarPago };
