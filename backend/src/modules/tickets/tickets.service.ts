import { randomUUID } from 'crypto';
import { notFound } from '../../common/errors';
import { buildQrPayload } from '../checkin/qr-signer';
import { EntradaRow, TicketsRepository } from './tickets.repository';

const DEFAULT_QR_VALIDITY_MS = 30 * 24 * 3600_000;
const AFTER_EVENT_GRACE_MS = 48 * 3600_000;

/** El QR vale hasta 48 h después del evento (antes caducaba a los 10 minutos de la compra, y la entrada dejaba de servir). */
export function qrExpiry(fechaEvento: string | null | undefined, now = new Date()): Date {
  const eventTime = fechaEvento ? Date.parse(fechaEvento) : NaN;
  if (Number.isNaN(eventTime)) return new Date(now.getTime() + DEFAULT_QR_VALIDITY_MS);
  return new Date(Math.max(eventTime + AFTER_EVENT_GRACE_MS, now.getTime() + 3600_000));
}

export class TicketsService {
  constructor(private readonly repo: TicketsRepository) {}

  /**
   * Emite la entrada de un pago. Idempotente: el webhook de Stripe y la confirmación de la app pueden llegar los dos
   * (y repetirse) y siempre resulta una sola entrada.
   */
  async emitirPorPago(input: { paymentIntentId: string; eventoId: string; usuarioId: string; asiento: string }): Promise<EntradaRow> {
    const existing = await this.repo.getEntradaPorPago(input.paymentIntentId);
    if (existing) return existing;

    const evento = await this.repo.getEvento(input.eventoId);
    if (!evento) throw notFound('Evento no encontrado');

    const id = randomUUID();
    const codigoQr = buildQrPayload({ ticketId: id, eventId: evento.id, seat: input.asiento, expiresAt: qrExpiry(evento.fecha_evento) });
    return this.repo.emitirEntrada({ id, eventoId: evento.id, usuarioId: input.usuarioId, codigoQr, asiento: input.asiento, precio: evento.precio, paymentIntentId: input.paymentIntentId });
  }
}
