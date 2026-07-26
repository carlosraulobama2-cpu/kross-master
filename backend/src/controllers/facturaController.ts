import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

async function crearFactura(req: Request, res: Response) {
  try {
    const usuarioId = (req as any).usuario.id;
    const { entradaId } = req.body;

    const { data: entrada, error } = await supabase
      .from('entradas')
      .select('*, eventos:evento_id(titulo, precio)')
      .eq('id', entradaId)
      .eq('usuario_id', usuarioId)
      .single();

    if (error || !entrada) {
      return res.status(404).json({ mensaje: 'Entrada no encontrada' });
    }

    const numeroFactura = `KROOS-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
    const gastosGestion = 1.2;
    const subtotal = entrada.precio_pagado;
    const total = subtotal + gastosGestion;

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nombre, email, razon_social, dni_cif')
      .eq('id', usuarioId)
      .single();

    const factura = {
      entrada_id: entradaId,
      usuario_id: usuarioId,
      numero_factura: numeroFactura,
      concepto: entrada.eventos?.titulo || 'Entrada evento',
      subtotal,
      gastos_gestion: gastosGestion,
      total,
      datos_fiscales: {
        nombre: usuario?.nombre,
        email: usuario?.email,
        razon_social: usuario?.razon_social,
        dni_cif: usuario?.dni_cif,
      },
      pdf_url: null,
    };

    const { data: facturaData, error: facturaError } = await supabase
      .from('facturas')
      .insert([factura])
      .select()
      .single();

    if (facturaError) throw facturaError;

    res.status(201).json({ factura: facturaData });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear factura', error: (error as Error).message });
  }
}

export { crearFactura };
