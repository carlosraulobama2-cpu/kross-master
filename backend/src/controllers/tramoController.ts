import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

async function crearTramo(req: Request, res: Response) {
  try {
    const artistaId = (req as any).usuario.id;
    const { eventoId, nombre, precio, aforo_total, orden } = req.body;

    const { data: evento, error: eventoError } = await supabase
      .from('eventos')
      .select('id, artista_id')
      .eq('id', eventoId)
      .single();

    if (eventoError || !evento || evento.artista_id !== artistaId) {
      return res.status(403).json({ mensaje: 'No autorizado para este evento' });
    }

    const { data, error } = await supabase
      .from('tramos_entrada')
      .insert([{
        evento_id: eventoId,
        nombre,
        precio,
        aforo_total,
        entradas_disponibles: aforo_total,
        orden: orden || 0,
        activo: true,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ tramo: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear tramo', error: (error as Error).message });
  }
}

async function listarTramos(req: Request, res: Response) {
  try {
    const { eventoId } = req.params;
    const { data, error } = await supabase
      .from('tramos_entrada')
      .select('*')
      .eq('evento_id', eventoId)
      .order('orden', { ascending: true });

    if (error) throw error;
    res.json({ tramos: data || [] });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar tramos', error: (error as Error).message });
  }
}

export { crearTramo, listarTramos };
