import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { parsearQr } from '../utils/qrSigner';

async function validarQr(req: Request, res: Response) {
  try {
    const { codigo_qr } = req.body;
    if (!codigo_qr) {
      return res.status(400).json({ mensaje: 'codigo_qr es requerido' });
    }

    const datosQr = parsearQr(codigo_qr);
    if (!datosQr) {
      return res.status(400).json({ mensaje: 'QR inválido' });
    }

    const { data: entrada, error } = await supabase
      .from('entradas')
      .select('*')
      .eq('codigo_qr', codigo_qr)
      .single();

    if (error || !entrada) {
      return res.status(404).json({ mensaje: 'Entrada no encontrada' });
    }

    if (entrada.estado === 'USADO') {
      return res.status(409).json({ mensaje: 'Esta entrada ya fue usada', entrada });
    }

    const { error: updateError } = await supabase
      .from('entradas')
      .update({ estado: 'USADO', fecha_escaneo: new Date().toISOString() })
      .eq('id', entrada.id);

    if (updateError) {
      return res.status(500).json({ mensaje: 'Error al actualizar la entrada', error: updateError.message });
    }

    res.json({ mensaje: 'Entrada válida y marcada como usada', entrada: { ...entrada, estado: 'USADO' } });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al validar QR', error: (error as Error).message });
  }
}

export { validarQr };
