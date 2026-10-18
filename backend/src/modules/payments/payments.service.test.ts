import { TicketsService } from '../tickets/tickets.service';
import { fakeRepository } from '../tickets/fake-repository';
import { PaymentsService } from './payments.service';

function setup(intent: { status?: string; metadata?: Record<string, string> } = {}) {
  const store = fakeRepository({ eventos: [{ id: 'ev1', precio: 25.5, entradas_disponibles: 2, fecha_evento: '2030-01-01T20:00:00Z', artista_id: 'art' }] });
  const created: Array<{ amount: number; metadata: Record<string, string> }> = [];
  const stripe = {
    paymentIntents: {
      create: async (params: any) => {
        created.push({ amount: params.amount, metadata: params.metadata });
        return { id: 'pi_123', client_secret: 'pi_123_secret_x' };
      },
      retrieve: async (id: string) => ({ id, status: intent.status ?? 'succeeded', amount: 2550, metadata: intent.metadata ?? { eventoId: 'ev1', usuarioId: 'u1', asiento: 'A-3' } }),
    },
  };
  const service = new PaymentsService(stripe as any, store.repo, new TicketsService(store.repo), 'eur');
  return { service, store, created };
}

describe('PaymentsService', () => {
  it('cobra el precio del evento, no lo que mande la app', async () => {
    const { service, created } = setup();
    const result = await service.crearIntento('u1', { eventoId: 'ev1' });
    expect(created[0].amount).toBe(2550);
    expect(created[0].metadata).toMatchObject({ eventoId: 'ev1', usuarioId: 'u1' });
    expect(result.clientSecret).toBe('pi_123_secret_x');
  });

  it('confirmar y el webhook emiten UNA sola entrada para el mismo pago', async () => {
    const { service, store } = setup();
    const first = await service.confirmar('u1', { paymentIntentId: 'pi_123', eventoId: 'ev1' });
    await service.procesarEvento({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_123', metadata: { eventoId: 'ev1', usuarioId: 'u1', asiento: 'A-3' } } } } as any);
    const again = await service.confirmar('u1', { paymentIntentId: 'pi_123', eventoId: 'ev1' });
    expect(store.entradas).toHaveLength(1);
    expect(again.entrada.id).toBe(first.entrada.id);
    expect(store.eventos.get('ev1')!.entradas_disponibles).toBe(1);
    expect(first.entrada.asiento).toBe('A-3');
  });

  it('no emite entrada con un pago de otra persona o sin cobrar', async () => {
    await expect(setup({ metadata: { eventoId: 'ev1', usuarioId: 'otro' } }).service.confirmar('u1', { paymentIntentId: 'pi_9', eventoId: 'ev1' })).rejects.toMatchObject({ status: 403 });
    await expect(setup({ status: 'requires_payment_method' }).service.confirmar('u1', { paymentIntentId: 'pi_9', eventoId: 'ev1' })).rejects.toMatchObject({ status: 409 });
  });

  it('no crea el cobro si el evento no existe o está agotado', async () => {
    const { service, store } = setup();
    await expect(service.crearIntento('u1', { eventoId: 'nope' })).rejects.toMatchObject({ status: 404 });
    store.eventos.get('ev1')!.entradas_disponibles = 0;
    await expect(service.crearIntento('u1', { eventoId: 'ev1' })).rejects.toMatchObject({ status: 409 });
  });

  it('ignora eventos de Stripe que no son un cobro completado', async () => {
    const { service, store } = setup();
    expect(await service.procesarEvento({ type: 'payment_intent.payment_failed', data: { object: {} } } as any)).toBe('ignorado');
    expect(store.entradas).toHaveLength(0);
  });
});
