import { Response } from 'express';
import { env } from '../../config/env';
import { stripe } from '../../config/stripe';
import { RequestWithUser } from '../../middleware/auth';
import { supabaseTicketsRepository } from '../tickets/tickets.repository';
import { TicketsService } from '../tickets/tickets.service';
import { PaymentsService } from './payments.service';

export const paymentsService = new PaymentsService(stripe, supabaseTicketsRepository, new TicketsService(supabaseTicketsRepository), env.currency);

export async function crearIntentoPago(req: RequestWithUser, res: Response) {
  // `monto` y `usuarioId` del cuerpo se ignoran: el precio es el del evento y el usuario es el de la sesión.
  res.json(await paymentsService.crearIntento(req.usuario!.id, { eventoId: req.body.eventoId, asiento: req.body.asiento }));
}

export async function confirmarPago(req: RequestWithUser, res: Response) {
  res.json(await paymentsService.confirmar(req.usuario!.id, { paymentIntentId: req.body.paymentIntentId, eventoId: req.body.eventoId }));
}
