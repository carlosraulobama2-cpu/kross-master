import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../lib/errors';
import { verificarEnlace } from '../lib/firma';
import { uuid } from '../lib/schemas';
import { db } from '../lib/supabase';
import { params, query } from '../middleware/validate';

/**
 * Lista de asistentes en CSV (se abre en Excel o Numbers). Enlace firmado que
 * caduca en 10 minutos; el organizador lo pide en /api/organizador/eventos/:id/exportar.
 */
export const exportesRouter = Router();

const celda = (v: unknown) => {
  const t = String(v ?? '');
  // Comillas dobles y nada de fórmulas (inyección CSV en hojas de cálculo).
  const seguro = /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
  return `"${seguro.replace(/"/g, '""')}"`;
};

const fecha = (f: string | null) => (f ? new Date(f).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : '');

interface Fila {
  codigo: string;
  estado: string;
  es_acompanante: boolean;
  titular_nombre: string | null;
  creado_en: string;
  usada_en: string | null;
  tramo: { nombre: string } | null;
  asiento: { seccion: string; fila: string; numero: number } | null;
  usuario: { nombre: string; email: string } | null;
  pedido: { canal: string; metodo_pago: string | null; total_centimos: number } | null;
}

exportesRouter.get('/:id.csv', async (req, res) => {
  const { id } = params(req, z.object({ id: uuid }));
  const { t } = query(req, z.object({ t: z.string().max(200) }));
  if (!verificarEnlace(`csv:${id}`, t)) throw new AppError(403, 'ENLACE_CADUCADO', 'El enlace ha caducado. Vuelve a exportar desde la app');

  const filas: Fila[] = [];
  // Por páginas: PostgREST limita cada respuesta.
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await db
      .from('entradas')
      .select(
        'codigo, estado, es_acompanante, titular_nombre, creado_en, usada_en, tramo:tramos(nombre), ' +
          'asiento:asientos!entradas_asiento_id_fkey(seccion, fila, numero), usuario:usuarios!entradas_usuario_id_fkey(nombre, email), ' +
          'pedido:pedidos(canal, metodo_pago, total_centimos)',
      )
      .eq('evento_id', id)
      .order('creado_en')
      .range(desde, desde + 999);
    if (error) throw error;
    filas.push(...(data as unknown as Fila[]));
    if (!data || data.length < 1000) break;
  }

  const cabecera = ['Código', 'Titular', 'Email', 'Tipo', 'Butaca', 'Estado', 'Canal', 'Pago', 'Acompañante', 'Comprada', 'Validada'];
  const lineas = filas.map((f) =>
    [
      f.codigo,
      f.titular_nombre ?? f.usuario?.nombre,
      f.usuario?.email,
      f.tramo?.nombre,
      f.asiento ? `${f.asiento.seccion ? `${f.asiento.seccion} ` : ''}Fila ${f.asiento.fila} · ${f.asiento.numero}` : '',
      f.estado,
      f.pedido?.canal,
      f.pedido?.metodo_pago ?? '',
      f.es_acompanante ? 'sí' : 'no',
      fecha(f.creado_en),
      fecha(f.usada_en),
    ]
      .map(celda)
      .join(';'),
  );
  res
    .set('Content-Type', 'text/csv; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="asistentes-${id.slice(0, 8)}.csv"`)
    .set('Cache-Control', 'no-store')
    // BOM para que Excel lea bien las tildes; ";" es el separador que usa Excel en español.
    .send(`﻿${[cabecera.map(celda).join(';'), ...lineas].join('\r\n')}`);
});
