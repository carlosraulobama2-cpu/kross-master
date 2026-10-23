import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prohibido } from '../lib/errors';
import { parsearToken, verificarFirma } from '../lib/qr';
import { idParam, uuid } from '../lib/schemas';
import { db, ok } from '../lib/supabase';
import { requireAuth, usuarioDe } from '../middleware/auth';
import { body, params } from '../middleware/validate';
import type { UsuarioSesion } from '../types';

/** Control de acceso en la puerta del evento. */
export const puertaRouter = Router();
puertaRouter.use(requireAuth);

export async function puedeEscanear(usuario: UsuarioSesion, eventoId: string): Promise<boolean> {
  if (usuario.rol === 'admin') return true;
  const [{ data: evento }, { data: staff }] = await Promise.all([
    db.from('eventos').select('organizador_id').eq('id', eventoId).maybeSingle(),
    db.from('staff_eventos').select('usuario_id').eq('evento_id', eventoId).eq('usuario_id', usuario.id).maybeSingle(),
  ]);
  return evento?.organizador_id === usuario.id || Boolean(staff);
}

/** Eventos que puedo escanear: los míos o donde soy staff, desde ayer. */
puertaRouter.get('/eventos', async (req, res) => {
  const yo = usuarioDe(req);
  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: asignaciones } = await db.from('staff_eventos').select('evento_id').eq('usuario_id', yo.id);
  const ids = (asignaciones ?? []).map((a) => a.evento_id);

  let consulta = db
    .from('eventos')
    .select('id, titulo, inicia_en, recinto, ciudad, imagen_url, organizador_id')
    .eq('estado', 'publicado')
    .gte('inicia_en', desde)
    .order('inicia_en');
  if (yo.rol !== 'admin') {
    consulta = ids.length ? consulta.or(`organizador_id.eq.${yo.id},id.in.(${ids.join(',')})`) : consulta.eq('organizador_id', yo.id);
  }
  res.json({ eventos: ok(await consulta.limit(50)) });
});

const validarSchema = z
  .object({
    eventoId: uuid,
    token: z.string().trim().max(200).optional(),
    codigo: z.string().trim().toUpperCase().regex(/^KM-[A-Z2-9]{4}-[A-Z2-9]{4}$/, 'Código no válido').optional(),
  })
  .refine((d) => d.token || d.codigo, 'Escanea un QR o escribe el código');

type Resultado = 'valida' | 'ya_usada' | 'invalida' | 'otro_evento' | 'anulada' | 'caducada';

const MENSAJES: Record<Resultado, string> = {
  valida: 'Entrada válida. ¡Adelante!',
  ya_usada: 'Esta entrada ya se ha usado',
  invalida: 'QR no reconocido',
  otro_evento: 'Esta entrada es de otro evento',
  anulada: 'Entrada anulada o reembolsada',
  caducada: 'QR caducado: pide que refresque la pantalla',
};

// Un escáner real hace como mucho ~1 lectura/segundo.
const limiteEscaneo = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });

puertaRouter.post('/validar', limiteEscaneo, async (req, res) => {
  const yo = usuarioDe(req);
  const { eventoId, token, codigo } = body(req, validarSchema);
  if (!(await puedeEscanear(yo, eventoId))) throw prohibido('No estás autorizado en la puerta de este evento');

  let entradaId: string | null = null;
  let resultado: Resultado | null = null;

  if (token) {
    const datos = parsearToken(token);
    if (!datos) {
      resultado = 'invalida';
    } else {
      const { data: e } = await db.from('entradas').select('id, qr_semilla').eq('id', datos.entradaId).maybeSingle();
      const firma = e ? verificarFirma(datos, e.qr_semilla) : 'invalida';
      if (firma === 'ok') entradaId = datos.entradaId;
      else resultado = firma;
    }
  } else if (codigo) {
    const { data: e } = await db.from('entradas').select('id').eq('codigo', codigo).maybeSingle();
    if (e) entradaId = e.id;
    else resultado = 'invalida';
  }

  if (entradaId) {
    const { data, error } = await db.rpc('validar_entrada', { p_entrada_id: entradaId, p_evento_id: eventoId, p_staff_id: yo.id });
    if (error) throw error;
    resultado = data as Resultado;
  } else {
    await db.from('escaneos').insert({ evento_id: eventoId, staff_id: yo.id, resultado });
  }

  const final = resultado ?? 'invalida';
  const entrada = entradaId
    ? ok(
        await db
          .from('entradas')
          .select('codigo, estado, usada_en, tramo:tramos(nombre), titular:usuarios!entradas_usuario_id_fkey(nombre)')
          .eq('id', entradaId)
          .single(),
      )
    : null;

  res.json({ resultado: final, valida: final === 'valida', mensaje: MENSAJES[final], entrada });
});

puertaRouter.get('/eventos/:id/resumen', async (req, res) => {
  const { id } = params(req, idParam);
  if (!(await puedeEscanear(usuarioDe(req), id))) throw prohibido();
  const [stats, ultimos] = await Promise.all([
    db.rpc('estadisticas_evento', { p_evento_id: id }),
    db
      .from('escaneos')
      .select('id, resultado, creado_en, entrada:entradas(codigo, tramo:tramos(nombre))')
      .eq('evento_id', id)
      .order('creado_en', { ascending: false })
      .limit(20),
  ]);
  if (stats.error) throw stats.error;
  const s = stats.data as { vendidas: number; validadas: number };
  res.json({ vendidas: s.vendidas, validadas: s.validadas, ultimos: ultimos.data ?? [] });
});
