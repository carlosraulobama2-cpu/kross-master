import { badRequest, conflict, forbidden, notFound } from '../../common/errors';
import { TicketsRepository, Usuario } from '../tickets/tickets.repository';
import { verificarQr } from './qr-signer';

const REASONS = { formato: 'QR con formato inválido', firma: 'QR no válido: la firma no coincide', expirado: 'QR expirado' } as const;

export class CheckinService {
  constructor(private readonly repo: TicketsRepository) {}

  /** Puerta del evento: QR firmado, escáner autorizado para ese evento y paso de VALIDO a USADO atómico. */
  async validar(escaner: Usuario, input: { codigoQr: string; dispositivo?: unknown }) {
    const check = verificarQr(input.codigoQr);
    if (!check.ok) throw badRequest(REASONS[check.reason]);

    const entrada = await this.repo.getEntradaPorQr(input.codigoQr);
    if (!entrada || entrada.id !== check.payload.ticket_id) throw notFound('Entrada no encontrada');
    if (!(await this.repo.puedeEscanear(escaner, entrada.evento_id))) throw forbidden('No estás autorizado a validar entradas de este evento');
    if (entrada.estado !== 'VALIDO') throw conflict(entrada.estado === 'USADO' ? 'Esta entrada ya fue usada' : `Entrada ${entrada.estado.toLowerCase()}`);

    const usada = await this.repo.marcarUsada(entrada.id, escaner.id);
    if (!usada) throw conflict('Esta entrada ya fue usada');
    await this.repo.registrarAcceso({ entrada: usada, escaneadoPor: escaner.id, dispositivo: input.dispositivo, nonce: check.payload.nonce });
    return { mensaje: 'Entrada válida y marcada como usada', entrada: usada };
  }
}
