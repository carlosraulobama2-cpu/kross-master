import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

async function registrarAcceso(req: Request, res: Response) {
  try {
    const { entradaId, eventoId, usuarioId, tipo_acceso, metodo_verificacion, dispositivo_info } = req.body;

    const { data, error } = await supabase
      .from('accesos')
      .insert([{
        entrada_id: entradaId,
        evento_id: eventoId,
        usuario_id: usuarioId,
        tipo_acceso: tipo_acceso || 'entrada',
        metodo_verificacion: metodo_verificacion || 'qr',
        dispositivo_info: dispositivo_info || {},
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ acceso: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar acceso', error: (error as Error).message });
  }
}

async function obtenerAnalyticsEvento(req: Request, res: Response) {
  try {
    const artistaId = (req as any).usuario.id;
    const { eventoId } = req.params;

    const { data: evento } = await supabase
      .from('eventos')
      .select('id')
      .eq('id', eventoId)
      .eq('artista_id', artistaId)
      .single();

    if (!evento) {
      return res.status(403).json({ mensaje: 'No autorizado para este evento' });
    }

    const { data: accesos, error } = await supabase
      .from('accesos')
      .select('*')
      .eq('evento_id', eventoId)
      .order('creado_en', { ascending: true });

    if (error) throw error;

    const totalAccesos = accesos?.length || 0;
    const accesosPorHora = (accesos || []).reduce((acc: any, acceso: any) => {
      const hora = new Date(acceso.creado_en).getHours();
      acc[hora] = (acc[hora] || 0) + 1;
      return acc;
    }, {});

    res.json({ totalAccesos, accesosPorHora, accesos: accesos || [] });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener analytics', error: (error as Error).message });
  }
}

export { registrarAcceso, obtenerAnalyticsEvento };
