interface QrPayload {
  ticket_id: string;
  event_id: string;
  seat: string;
  firma: string;
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

function buildQrPayload({ ticketId, eventId, seat }: { ticketId: string; eventId: string; seat: string }): string {
  const payload = { ticket_id: ticketId, event_id: eventId, seat };
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

export { generarFirmaSimulada, buildQrPayload, parsearQr };
