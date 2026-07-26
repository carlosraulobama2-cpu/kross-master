interface QrPayload {
  ticket_id: string;
  event_id: string;
  seat: string;
  exp: number;
  nonce: string;
  firma: string;
}

function generarNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generarFirmaSimulada(payload: Record<string, unknown>): string {
  const base = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }
  return `SIG-${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
}

function buildQrPayload({ ticketId, eventId, seat, ttlSeconds = 600 }: { ticketId: string; eventId: string; seat: string; ttlSeconds?: number }): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const nonce = generarNonce();
  const payload = { ticket_id: ticketId, event_id: eventId, seat, exp, nonce };
  const firma = generarFirmaSimulada(payload);
  const fullPayload = { ...payload, firma } as QrPayload;
  return JSON.stringify(fullPayload);
}

function parsearQr(codigoQr: string): QrPayload | null {
  try {
    return JSON.parse(codigoQr) as QrPayload;
  } catch (e) {
    return null;
  }
}

function esQrExpirado(payload: QrPayload): boolean {
  return Date.now() / 1000 > payload.exp;
}

export { buildQrPayload, parsearQr, esQrExpirado, generarNonce, generarFirmaSimulada };
