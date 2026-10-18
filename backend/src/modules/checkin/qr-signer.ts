import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { env } from '../../config/env';

export interface QrPayload {
  ticket_id: string;
  event_id: string;
  seat: string;
  exp: number;
  nonce: string;
  firma: string;
}

export type QrCheck =
  | { ok: true; payload: QrPayload }
  | { ok: false; reason: 'formato' | 'firma' | 'expirado' };

type Unsigned = Omit<QrPayload, 'firma'>;

/** HMAC-SHA256 sobre los campos en orden fijo. Sin la clave del servidor no se puede fabricar un QR válido. */
export function firmar(payload: Unsigned, secret: string = env.qrSigningSecret): string {
  const base = [payload.ticket_id, payload.event_id, payload.seat, payload.exp, payload.nonce].join('|');
  return createHmac('sha256', secret).update(base).digest('hex');
}

export function buildQrPayload(input: { ticketId: string; eventId: string; seat: string; expiresAt: Date; secret?: string }): string {
  const unsigned: Unsigned = {
    ticket_id: input.ticketId,
    event_id: input.eventId,
    seat: input.seat,
    exp: Math.floor(input.expiresAt.getTime() / 1000),
    nonce: randomUUID(),
  };
  return JSON.stringify({ ...unsigned, firma: firmar(unsigned, input.secret) } satisfies QrPayload);
}

export function parsearQr(codigoQr: string): QrPayload | null {
  try {
    const data = JSON.parse(codigoQr);
    if (!data || typeof data !== 'object') return null;
    return data as QrPayload;
  } catch {
    return null;
  }
}

/** Comprueba formato, firma y caducidad (en ese orden: no se revela nada de un QR que no esté firmado). */
export function verificarQr(codigoQr: string, opts: { secret?: string; now?: Date } = {}): QrCheck {
  const payload = parsearQr(codigoQr);
  if (!payload || !payload.ticket_id || !payload.event_id || !payload.nonce || typeof payload.exp !== 'number' || typeof payload.firma !== 'string') {
    return { ok: false, reason: 'formato' };
  }
  const expected = Buffer.from(firmar(payload, opts.secret));
  const given = Buffer.from(payload.firma);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: 'firma' };
  if ((opts.now ?? new Date()).getTime() / 1000 > payload.exp) return { ok: false, reason: 'expirado' };
  return { ok: true, payload };
}
