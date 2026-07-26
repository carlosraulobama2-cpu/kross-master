import { buildQrPayload, parsearQr } from '../utils/qrSigner';

describe('qrSigner', () => {
  it('buildQrPayload genera un JSON con ticket_id, event_id, seat y firma', () => {
    const payload = buildQrPayload({ ticketId: 'TK-1', eventId: 'EV-1', seat: 'A-1' });
    const parsed = JSON.parse(payload);

    expect(parsed.ticket_id).toBe('TK-1');
    expect(parsed.event_id).toBe('EV-1');
    expect(parsed.seat).toBe('A-1');
    expect(typeof parsed.firma).toBe('string');
    expect(parsed.firma.startsWith('SIG-')).toBe(true);
  });

  it('parsearQr devuelve null si el JSON es inválido', () => {
    expect(parsearQr('no-es-json')).toBeNull();
  });

  it('parsearQr parsea correctamente un payload válido', () => {
    const payload = buildQrPayload({ ticketId: 'TK-2', eventId: 'EV-2', seat: 'B-2' });
    const parsed = parsearQr(payload);

    expect(parsed?.ticket_id).toBe('TK-2');
    expect(parsed?.seat).toBe('B-2');
  });
});
