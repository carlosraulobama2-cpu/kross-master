import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

async function agregarFavorito(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { eventoId } = req.body;

    const { data, error } = await supabase
      .from('favoritos')
      .insert([{ usuario_id: usuarioId, evento_id: eventoId }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ favorito: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al agregar favorito', error: (error as Error).message });
  }
}

async function quitarFavorito(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { eventoId } = req.body;

    const { error } = await supabase
      .from('favoritos')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('evento_id', eventoId);

    if (error) throw error;
    res.json({ mensaje: 'Favorito eliminado' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al quitar favorito', error: (error as Error).message });
  }
}

async function listarFavoritos(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { data, error } = await supabase
      .from('favoritos')
      .select(`
        *,
        eventos:evento_id(*)
      `)
      .eq('usuario_id', usuarioId)
      .order('creado_en', { ascending: false });

    if (error) throw error;
    res.json({ favoritos: data || [] });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar favoritos', error: (error as Error).message });
  }
}

export { agregarFavorito, quitarFavorito, listarFavoritos };
