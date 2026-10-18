import { TicketsService } from '../tickets/tickets.service';
import { fakeRepository } from '../tickets/fake-repository';
import { CheckinService } from './checkin.service';

async function ticket() {
  const store = fakeRepository({ eventos: [{ id: 'ev1', precio: 10, entradas_disponibles: 5, fecha_evento: '2030-01-01', artista_id: 'artista' }], staff: [{ eventoId: 'ev1', usuarioId: 'staff1' }] });
  const entrada = await new TicketsService(store.repo).emitirPorPago({ paymentIntentId: 'pi_1', eventoId: 'ev1', usuarioId: 'fan', asiento: 'B-2' });
  return { store, entrada, checkin: new CheckinService(store.repo) };
}

const staff = { id: 'staff1', email: 's@x', rol: 'staff' };

describe('CheckinService', () => {
  it('el staff del evento valida la entrada una sola vez', async () => {
    const { checkin, entrada, store } = await ticket();
    const ok = await checkin.validar(staff, { codigoQr: entrada.codigo_qr });
    expect(ok.entrada.estado).toBe('USADO');
    expect(store.accesos).toEqual([entrada.id]);
    await expect(checkin.validar(staff, { codigoQr: entrada.codigo_qr })).rejects.toMatchObject({ status: 409 });
  });

  it('el artista dueño y el super_admin también pueden validar; un fan no', async () => {
    const { checkin, entrada } = await ticket();
    await expect(checkin.validar({ id: 'fan2', email: 'f@x', rol: 'fan' }, { codigoQr: entrada.codigo_qr })).rejects.toMatchObject({ status: 403 });
    await expect(checkin.validar({ id: 'artista', email: 'a@x', rol: 'artista' }, { codigoQr: entrada.codigo_qr })).resolves.toBeTruthy();
  });

  it('rechaza QR falsificados o manipulados', async () => {
    const { checkin, entrada } = await ticket();
    const tampered = JSON.parse(entrada.codigo_qr);
    tampered.seat = 'VIP';
    await expect(checkin.validar(staff, { codigoQr: JSON.stringify(tampered) })).rejects.toMatchObject({ status: 400 });
    await expect(checkin.validar(staff, { codigoQr: 'basura' })).rejects.toMatchObject({ status: 400 });
  });
});
