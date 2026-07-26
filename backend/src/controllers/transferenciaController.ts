import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { buildQrPayload } from '../utils/qrSigner';

async function crearTransferencia(req: Request, res: Response) {
  try {
    const usuarioOrigenId = (req as any).usuario.id;
    const { entradaId, emailDestino } = req.body;

    const { data: entrada, error: entradaError } = await supabase
      .from('entradas')
      .select('*, eventos:evento_id(artista_id)')
      .eq('id', entradaId)
      .eq('usuario_id', usuarioOrigenId)
      .single();

    if (entradaError || !entrada) {
      return res.status(404).json({ mensaje: 'Entrada no encontrada' });
    }

    if (entrada.transferida || entrada.estado === 'USADO') {
      return res.status(400).json({ mensaje: 'Entrada no transferible' });
    }

    const { data: usuarioDestino, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', emailDestino)
      .single();

    if (usuarioError || !usuarioDestino) {
      return res.status(404).json({ mensaje: 'Usuario destino no encontrado' });
    }

    const codigoTransferencia = `TRF-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;

    const { data: transferencia, error } = await supabase
      .from('transferencias')
      .insert([{
        entrada_id: entradaId,
        usuario_origen_id: usuarioOrigenId,
        usuario_destino_id: usuarioDestino.id,
        codigo_transferencia: codigoTransferencia,
        estado: 'pendiente',
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ transferencia });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear transferencia', error: (error as Error).message });
  }
}

async function aceptarTransferencia(req: Request, res: Response) {
  try {
    const usuarioDestinoId = (req as any).usuario.id;
    const { codigoTransferencia } = req.body;

    const { data: transferencia, error } = await supabase
      .from('transferencias')
      .select('*')
      .eq('codigo_transferencia', codigoTransferencia)
      .eq('usuario_destino_id', usuarioDestinoId)
      .eq('estado', 'pendiente')
      .single();

    if (error || !transferencia) {
      return res.status(404).json({ mensaje: 'Transferencia no encontrada' });
    }

    const nuevoCodigoQr = buildQrPayload({
      ticketId: `TRF-${Date.now()}`,
      eventId: `EV-2026-${transferencia.entrada_id}`,
      seat: 'TRANSFER',
    });

    const { error: updateError } = await supabase
      .from('entradas')
      .update({
        usuario_id: usuarioDestinoId,
        codigo_qr: nuevoCodigoQr,
        transferida: true,
        estado: 'VALIDO',
      })
      .eq('id', transferencia.entrada_id);

    if (updateError) throw updateError;

    await supabase
      .from('transferencias')
      .update({ estado: 'completada' })
      .eq('id', transferencia.id);

    res.json({ mensaje: 'Transferencia aceptada', entradaId: transferencia.entrada_id });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al aceptar transferencia', error: (error as Error).message });
  }
}

export { crearTransferencia, aceptarTransferencia };
