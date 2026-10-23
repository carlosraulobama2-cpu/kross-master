import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError, noEncontrado } from '../lib/errors';
import { firmarEnlace, verificarEnlace } from '../lib/firma';
import { idParam } from '../lib/schemas';
import { db, ok } from '../lib/supabase';
import { generarPkpass, walletDisponible, type DatosPase } from '../lib/wallet';
import { params, query } from '../middleware/validate';

/** Descarga del .pkpass con enlace firmado (Safari lo abre sin sesión). */
export const walletRouter = Router();

export async function datosPase(entradaId: string, usuarioId?: string): Promise<DatosPase> {
  let consulta = db
    .from('entradas')
    .select('id, codigo, estado, usuario_id, tramo:tramos(nombre), titular:usuarios!entradas_usuario_id_fkey(nombre), evento:eventos(id, titulo, inicia_en, recinto, ciudad)')
    .eq('id', entradaId);
  if (usuarioId) consulta = consulta.eq('usuario_id', usuarioId);
  const e = ok(await consulta.maybeSingle()) as unknown as {
    id: string; codigo: string; estado: string; tramo: { nombre: string }; titular: { nombre: string }; evento: DatosPase['evento'];
  } | null;
  if (!e) throw noEncontrado('Entrada');
  if (e.estado !== 'valida') throw new AppError(409, 'ENTRADA_NO_VALIDA', 'Solo las entradas válidas se pueden añadir a Wallet');
  return { entradaId: e.id, codigo: e.codigo, titular: e.titular?.nombre || 'Asistente', tramo: e.tramo.nombre, evento: e.evento };
}

export const urlPkpass = (entradaId: string) => `${env.PUBLIC_API_URL ?? ''}/api/wallet/apple/${entradaId}?t=${firmarEnlace(`wallet:${entradaId}`, 15)}`;

walletRouter.get('/apple/:id', async (req, res) => {
  const { id } = params(req, idParam);
  const { t } = query(req, z.object({ t: z.string().max(200) }));
  if (!walletDisponible().apple) throw new AppError(404, 'WALLET_NO_DISPONIBLE', 'Apple Wallet no está configurado');
  if (!verificarEnlace(`wallet:${id}`, t)) throw new AppError(403, 'ENLACE_CADUCADO', 'El enlace ha caducado. Vuelve a pulsar «Añadir a Apple Wallet»');
  const pase = await generarPkpass(await datosPase(id));
  res.type('application/vnd.apple.pkpass').set('Content-Disposition', `attachment; filename="kroos-${id.slice(0, 8)}.pkpass"`).send(pase);
});
