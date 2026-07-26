import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

async function crearResena(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { eventoId, calificacion, comentario } = req.body;

    const { data, error } = await supabase
      .from('resenas')
      .insert([{
        usuario_id: usuarioId,
        evento_id: eventoId,
        calificacion,
        comentario,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ resena: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear reseña', error: (error as Error).message });
  }
}

async function listarResenas(req: Request, res: Response) {
  try {
    const { eventoId } = req.params;
    const { data, error } = await supabase
      .from('resenas')
      .select(`
        *,
        usuarios:usuario_id(nombre, nombre_artistico)
      `)
      .eq('evento_id', eventoId)
      .order('creado_en', { ascending: false });

    if (error) throw error;
    res.json({ resenas: data || [] });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar reseñas', error: (error as Error).message });
  }
}

export { crearResena, listarResenas };
