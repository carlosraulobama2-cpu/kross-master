import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

async function listarNotificaciones(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', usuarioId)
      .order('creado_en', { ascending: false });

    if (error) throw error;
    res.json({ notificaciones: data || [] });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar notificaciones', error: (error as Error).message });
  }
}

async function marcarNotificacionLeida(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
      .eq('usuario_id', usuarioId)
      .select()
      .single();

    if (error) throw error;
    res.json({ notificacion: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al marcar notificación', error: (error as Error).message });
  }
}

export { listarNotificaciones, marcarNotificacionLeida };
