import type Stripe from 'stripe';
import { badRequest, conflict, forbidden, notFound } from '../../common/errors';
import { TicketsRepository } from '../tickets/tickets.repository';
import { TicketsService } from '../tickets/tickets.service';

type StripeLike = {
  paymentIntents: {
    create(params: Stripe.PaymentIntentCreateParams, options?: Stripe.RequestOptions): Promise<Pick<Stripe.PaymentIntent, 'id' | 'client_secret'>>;
    retrieve(id: string): Promise<Pick<Stripe.PaymentIntent, 'id' | 'status' | 'metadata' | 'amount'>>;
  };
};

export const DEFAULT_SEAT = 'General';

export class PaymentsService {
  constructor(
    private readonly stripe: StripeLike,
    private readonly repo: TicketsRepository,
    private readonly tickets: TicketsService,
    private readonly currency: string,
  ) {}

  /** El importe sale SIEMPRE del precio del evento en la base de datos, nunca de lo que mande la app. */
  async crearIntento(usuarioId: string, input: { eventoId: string; asiento?: string }) {
    const evento = await this.repo.getEvento(input.eventoId);
    if (!evento) throw notFound('Evento no encontrado');
    if (evento.entradas_disponibles <= 0) throw conflict('No hay entradas disponibles');
    const amount = Math.round(Number(evento.precio) * 100);
    if (!Number.isFinite(amount) || amount <= 0) throw badRequest('El evento no tiene un precio válido');

    const intent = await this.stripe.paymentIntents.create({
      amount,
      currency: this.currency,
      metadata: { eventoId: evento.id, usuarioId, asiento: input.asiento || DEFAULT_SEAT },
      automatic_payment_methods: { enabled: true },
    });
    return { clientSecret: intent.client_secret, paymentIntentId: intent.id, monto: amount / 100, moneda: this.currency };
  }

  /**
   * La app confirma tras pagar. Se comprueba con Stripe que el pago existe, está cobrado y es de este usuario y evento:
   * antes bastaba con mandar cualquier paymentIntentId para conseguir una entrada.
   */
  async confirmar(usuarioId: string, input: { paymentIntentId: string; eventoId: string }) {
    const intent = await this.stripe.paymentIntents.retrieve(input.paymentIntentId);
    if (intent.metadata?.usuarioId !== usuarioId || intent.metadata?.eventoId !== input.eventoId) throw forbidden('Este pago no corresponde a tu compra');
    if (intent.status !== 'succeeded') throw conflict('El pago todavía no se ha completado');
    const entrada = await this.tickets.emitirPorPago({
      paymentIntentId: intent.id,
      eventoId: input.eventoId,
      usuarioId,
      asiento: intent.metadata.asiento || DEFAULT_SEAT,
    });
    return { entrada };
  }

  /** Webhook de Stripe (ya verificado). Solo un pago cobrado emite entrada; el resto de eventos se ignora. */
  async procesarEvento(event: Pick<Stripe.Event, 'type' | 'data'>): Promise<'emitida' | 'ignorado'> {
    if (event.type !== 'payment_intent.succeeded') return 'ignorado';
    const intent = event.data.object as Stripe.PaymentIntent;
    const { eventoId, usuarioId, asiento } = intent.metadata ?? {};
    if (!eventoId || !usuarioId) return 'ignorado';
    await this.tickets.emitirPorPago({ paymentIntentId: intent.id, eventoId, usuarioId, asiento: asiento || DEFAULT_SEAT });
    return 'emitida';
  }
}
