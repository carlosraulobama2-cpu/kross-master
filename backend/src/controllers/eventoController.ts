import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

async function crear(req: Request, res: Response) {
  try {
    const { titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, imagen_url } = req.body;
    if (!titulo || !fecha_evento || !precio || !aforo_total) {
      return res.status(400).json({ mensaje: 'titulo, fecha_evento, precio y aforo_total son requeridos' });
    }

    const { data, error } = await supabase
      .from('eventos')
      .insert([{
        titulo,
        descripcion,
        lugar,
        categoria,
        fecha_evento,
        precio,
        aforo_total,
        entradas_disponibles: aforo_total,
        imagen_url,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ evento: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear evento', error: (error as Error).message });
  }
}

async function listar(req: Request, res: Response) {
  try {
    const { categoria } = req.query;
    let query = supabase.from('eventos').select('*');

    if (categoria) {
      query = query.eq('categoria', categoria as string);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ eventos: data || [] });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar eventos', error: (error as Error).message });
  }
}

async function obtener(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }

    res.json({ evento: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener evento', error: (error as Error).message });
  }
}

async function comprar(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { asiento, tramoId } = req.body;
    const usuarioId = (req as any).usuario.id;

    const { data: evento, error: eventoError } = await supabase
      .from('eventos')
      .select('*')
      .eq('id', id)
      .single();

    if (eventoError || !evento) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }

    if (tramoId) {
      const { data: tramo, error: tramoError } = await supabase
        .from('tramos_entrada')
        .select('*')
        .eq('id', tramoId)
        .eq('evento_id', id)
        .single();

      if (tramoError || !tramo) {
        return res.status(404).json({ mensaje: 'Tramo no encontrado' });
      }

      if (tramo.entradas_disponibles <= 0) {
        return res.status(409).json({ mensaje: 'No hay entradas disponibles en este tramo' });
      }

      const ticketId = `TK-${Math.floor(Math.random() * 9000) + 1000}`;
      const eventId = `EV-2026-${evento.id}`;
      const { buildQrPayload } = require('../utils/qrSigner');
      const codigoQr = buildQrPayload({ ticketId, eventId, seat: asiento || tramo.nombre });

      const { data: entrada, error: entradaError } = await supabase
        .from('entradas')
        .insert([{
          evento_id: evento.id,
          usuario_id: usuarioId,
          tramo_id: tramoId,
          codigo_qr: codigoQr,
          asiento: asiento || tramo.nombre,
          precio_pagado: tramo.precio,
          estado: 'VALIDO',
        }])
        .select()
        .single();

      if (entradaError) throw entradaError;

      await supabase
        .from('tramos_entrada')
        .update({ entradas_disponibles: (tramo.entradas_disponibles || 0) - 1 })
        .eq('id', tramoId);

      await supabase
        .from('eventos')
        .update({ entradas_disponibles: (evento.entradas_disponibles || 0) - 1 })
        .eq('id', evento.id);

      res.status(201).json({ entrada });
    } else {
      if (evento.entradas_disponibles <= 0) {
        return res.status(409).json({ mensaje: 'No hay entradas disponibles' });
      }

    const ticketId = `TK-${Math.floor(Math.random() * 9000) + 1000}`;
    const eventId = `EV-2026-${evento.id}`;
    const { buildQrPayload } = require('../utils/qrSigner');
      const codigoQr = buildQrPayload({ ticketId, eventId, seat: asiento || 'A-12', ttlSeconds: 600 });

      const { data: entrada, error: entradaError } = await supabase
        .from('entradas')
        .insert([{
          evento_id: evento.id,
          usuario_id: usuarioId,
          codigo_qr: codigoQr,
          asiento: asiento || 'A-12',
          precio_pagado: evento.precio,
          estado: 'VALIDO',
        }])
        .select()
        .single();

      if (entradaError) throw entradaError;

      await supabase
        .from('eventos')
        .update({ entradas_disponibles: (evento.entradas_disponibles || 0) - 1 })
        .eq('id', evento.id);

      res.status(201).json({ entrada });
    }
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al comprar entrada', error: (error as Error).message });
  }
}

export { crear, listar, obtener, comprar };
