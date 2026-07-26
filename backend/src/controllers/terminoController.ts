import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

async function aceptarTerminos(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { version, tipo = 'terminos' } = req.body;

    const { data, error } = await supabase
      .from('terminos_aceptados')
      .insert([{
        usuario_id: usuarioId,
        version,
        tipo,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent') || undefined,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ aceptacion: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al aceptar términos', error: (error as Error).message });
  }
}

async function verificarAceptacion(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { version, tipo = 'terminos' } = req.query;

    const { data, error } = await supabase
      .from('terminos_aceptados')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('version', version as string)
      .eq('tipo', tipo as string)
      .order('creado_en', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.json({ aceptado: false });
    }

    res.json({ aceptado: true, aceptacion: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al verificar aceptación', error: (error as Error).message });
  }
}

export { aceptarTerminos, verificarAceptacion };
