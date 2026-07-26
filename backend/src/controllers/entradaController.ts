import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

async function listarMisEntradas(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { data, error } = await supabase
      .from('entradas')
      .select(`
        *,
        eventos:titulo, lugar, fecha_evento, imagen_url
      `)
      .eq('usuario_id', usuarioId)
      .order('creado_en', { ascending: false });

    if (error) throw error;
    res.json({ entradas: data || [] });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar entradas', error: (error as Error).message });
  }
}

export { listarMisEntradas };
