import { Response } from 'express';
import { RequestWithUser } from '../../middleware/auth';
import { supabaseTicketsRepository } from '../tickets/tickets.repository';
import { CheckinService } from './checkin.service';

const checkin = new CheckinService(supabaseTicketsRepository);

export async function validarQr(req: RequestWithUser, res: Response) {
  res.json(await checkin.validar(req.usuario!, { codigoQr: req.body.codigo_qr, dispositivo: req.body.dispositivo_info }));
}
