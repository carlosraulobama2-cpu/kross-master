import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError, noEncontrado } from '../lib/errors';
import { uuid } from '../lib/schemas';
import { db, ok } from '../lib/supabase';
import { optionalAuth } from '../middleware/auth';
import { body } from '../middleware/validate';

/** Centro de ayuda: preguntas frecuentes públicas y formulario de contacto. */
export const ayudaRouter = Router();

ayudaRouter.get('/', async (_req, res) => {
  const [faqs, cfg] = await Promise.all([
    db.from('faqs').select('id, categoria, pregunta, respuesta, orden').eq('activo', true).order('categoria').order('orden'),
    db.from('configuracion').select('email_soporte').eq('id', 1).single(),
  ]);
  if (faqs.error) throw faqs.error;
  res.set('Cache-Control', 'public, max-age=300').json({ faqs: faqs.data, email: cfg.data?.email_soporte ?? null });
});

const limiteContacto = rateLimit({ windowMs: 60 * 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, skip: () => env.NODE_ENV === 'test' });

ayudaRouter.post('/contacto', limiteContacto, optionalAuth, async (req, res) => {
  const d = body(
    req,
    z.object({
      email: z.string().trim().toLowerCase().email('Email no válido').optional(),
      asunto: z.string().trim().min(3, 'Indica el asunto').max(120),
      mensaje: z.string().trim().min(10, 'Cuéntanos un poco más (mínimo 10 caracteres)').max(3000),
      pedidoId: uuid.optional(),
    }),
  );
  const yo = req.usuario;
  const email = yo?.email ?? d.email;
  if (!email) throw new AppError(400, 'DATOS_INVALIDOS', 'Indica tu email para poder responderte', [{ campo: 'email', mensaje: 'Indica tu email' }]);
  // Solo se adjunta un pedido si es de quien escribe.
  let pedidoId: string | null = null;
  if (d.pedidoId && yo) {
    const p = ok(await db.from('pedidos').select('id').eq('id', d.pedidoId).eq('usuario_id', yo.id).maybeSingle());
    if (!p) throw noEncontrado('Pedido');
    pedidoId = p.id;
  }
  const consulta = ok(
    await db
      .from('consultas_soporte')
      .insert({ usuario_id: yo?.id ?? null, email, asunto: d.asunto, mensaje: d.mensaje, pedido_id: pedidoId })
      .select('id, estado, creado_en')
      .single(),
  );
  res.status(201).json({ consulta });
});
