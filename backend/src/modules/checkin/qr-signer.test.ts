import { buildQrPayload, parsearQr, verificarQr } from './qr-signer';

const SECRET = 'secreto-de-prueba';
const input = { ticketId: 'T-1', eventId: 'E-1', seat: 'A-1', expiresAt: new Date(Date.now() + 3600_000), secret: SECRET };

describe('qr-signer', () => {
  it('un QR recién firmado se verifica', () => {
    const result = verificarQr(buildQrPayload(input), { secret: SECRET });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload).toMatchObject({ ticket_id: 'T-1', event_id: 'E-1', seat: 'A-1' });
  });

  it('rechaza un QR firmado con otra clave (falsificación)', () => {
    const forged = buildQrPayload({ ...input, secret: 'otra-clave' });
    expect(verificarQr(forged, { secret: SECRET })).toEqual({ ok: false, reason: 'firma' });
  });

  it('rechaza un QR al que se le cambió algún dato', () => {
    const tampered = JSON.parse(buildQrPayload(input));
    tampered.seat = 'VIP-1';
    expect(verificarQr(JSON.stringify(tampered), { secret: SECRET })).toEqual({ ok: false, reason: 'firma' });
  });

  it('rechaza un QR caducado y uno con formato inválido', () => {
    const qr = buildQrPayload({ ...input, expiresAt: new Date(Date.now() - 1000) });
    expect(verificarQr(qr, { secret: SECRET })).toEqual({ ok: false, reason: 'expirado' });
    expect(verificarQr('no-es-json', { secret: SECRET })).toEqual({ ok: false, reason: 'formato' });
    expect(verificarQr('{"ticket_id":"x"}', { secret: SECRET })).toEqual({ ok: false, reason: 'formato' });
  });

  it('parsearQr devuelve null si el JSON es inválido', () => {
    expect(parsearQr('no-es-json')).toBeNull();
  });

  it('cada QR lleva un nonce distinto', () => {
    expect(JSON.parse(buildQrPayload(input)).nonce).not.toBe(JSON.parse(buildQrPayload(input)).nonce);
  });
});
