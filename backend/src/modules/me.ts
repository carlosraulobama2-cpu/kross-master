import { Router } from 'express';
import { z } from 'zod';
import { auditar } from '../lib/auditoria';
import { AppError } from '../lib/errors';
import { stripe } from '../lib/stripe';
import { db, ok } from '../lib/supabase';
import { requireAuth, usuarioDe } from '../middleware/auth';
import { body } from '../middleware/validate';

export const meRouter = Router();
meRouter.use(requireAuth);

const CAMPOS_PERFIL =
  'id, email, nombre, rol, avatar_url, telefono, bio, nombre_artistico, ciudad, stripe_onboarding_completo, creado_en';

meRouter.get('/', async (req, res) => {
  const yo = usuarioDe(req);
  const perfil = ok(await db.from('usuarios').select(CAMPOS_PERFIL).eq('id', yo.id).single());
  const { count: noLeidas } = await db
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('usuario_id', yo.id)
    .eq('leida', false);
  res.json({ usuario: perfil, notificacionesSinLeer: noLeidas ?? 0 });
});

const opcional = (max: number) => z.string().trim().max(max).nullable().optional();

const perfilSchema = z.object({
  nombre: z.string().trim().min(2).max(80).optional(),
  telefono: opcional(30),
  bio: opcional(500),
  ciudad: opcional(80),
  nombre_artistico: opcional(80),
  avatar_url: z.string().url().max(500).nullable().optional(),
});

meRouter.patch('/', async (req, res) => {
  const cambios = body(req, perfilSchema);
  const perfil = ok(
    await db
      .from('usuarios')
      .update({ ...cambios, actualizado_en: new Date().toISOString() })
      .eq('id', usuarioDe(req).id)
      .select(CAMPOS_PERFIL)
      .single(),
  );
  res.json({ usuario: perfil });
});

meRouter.put('/push-token', async (req, res) => {
  const { token } = body(req, z.object({ token: z.string().max(200).nullable() }));
  ok(await db.from('usuarios').update({ push_token: token }).eq('id', usuarioDe(req).id));
  res.status(204).end();
});

/** Un fan pasa a organizador para poder publicar eventos. */
meRouter.post('/organizador', async (req, res) => {
  const yo = usuarioDe(req);
  const datos = body(
    req,
    z.object({
      nombre_artistico: z.string().trim().min(2, 'Escribe el nombre que verán los asistentes').max(80),
      telefono: z.string().trim().min(6, 'Necesitamos un teléfono de contacto').max(30),
    }),
  );
  if (yo.rol === 'fan') {
    ok(await db.from('usuarios').update({ ...datos, rol: 'organizador' }).eq('id', yo.id));
    await auditar(yo.id, 'usuario.hacerse_organizador', 'usuario', yo.id, datos);
  } else {
    ok(await db.from('usuarios').update(datos).eq('id', yo.id));
  }
  const perfil = ok(await db.from('usuarios').select(CAMPOS_PERFIL).eq('id', yo.id).single());
  res.json({ usuario: perfil });
});

/** Enlace de alta en Stripe Connect para cobrar las ventas. */
meRouter.post('/stripe/onboarding', async (req, res) => {
  const yo = usuarioDe(req);
  if (yo.rol === 'fan') throw new AppError(403, 'PROHIBIDO', 'Solo los organizadores pueden conectar Stripe');
  const { volverA } = body(req, z.object({ volverA: z.string().url() }));

  const perfil = ok(await db.from('usuarios').select('stripe_account_id').eq('id', yo.id).single());
  let cuentaId = perfil.stripe_account_id as string | null;
  if (!cuentaId) {
    const cuenta = await stripe.accounts.create({
      type: 'express',
      email: yo.email,
      country: 'ES',
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { usuarioId: yo.id },
    });
    cuentaId = cuenta.id;
    ok(await db.from('usuarios').update({ stripe_account_id: cuentaId }).eq('id', yo.id));
  }

  const enlace = await stripe.accountLinks.create({
    account: cuentaId,
    refresh_url: volverA,
    return_url: volverA,
    type: 'account_onboarding',
  });
  res.json({ url: enlace.url });
});

meRouter.get('/stripe/estado', async (req, res) => {
  const yo = usuarioDe(req);
  const perfil = ok(await db.from('usuarios').select('stripe_account_id').eq('id', yo.id).single());
  if (!perfil.stripe_account_id) {
    res.json({ conectado: false, completo: false });
    return;
  }
  const cuenta = await stripe.accounts.retrieve(perfil.stripe_account_id);
  const completo = Boolean(cuenta.charges_enabled && cuenta.details_submitted);
  ok(await db.from('usuarios').update({ stripe_onboarding_completo: completo }).eq('id', yo.id));
  res.json({ conectado: true, completo });
});

/** Baja de cuenta (RGPD): anonimiza el perfil y desactiva el acceso. */
meRouter.delete('/', async (req, res) => {
  const yo = usuarioDe(req);
  const anonimo = `borrado-${yo.id}@kroosmaster.invalid`;
  ok(
    await db
      .from('usuarios')
      .update({
        email: anonimo,
        nombre: 'Usuario eliminado',
        telefono: null,
        bio: null,
        avatar_url: null,
        push_token: null,
        bloqueado: true,
      })
      .eq('id', yo.id),
  );
  // Borrado lógico en auth: conserva los pedidos para contabilidad.
  await db.auth.admin.deleteUser(yo.id, true);
  await auditar(yo.id, 'usuario.baja', 'usuario', yo.id);
  res.status(204).end();
});

meRouter.get('/favoritos', async (req, res) => {
  const favoritos = ok(await db.from('favoritos').select('evento_id').eq('usuario_id', usuarioDe(req).id));
  const ids = (favoritos ?? []).map((f) => f.evento_id);
  const eventos = ids.length ? ok(await db.from('catalogo_eventos').select('*').in('id', ids).order('inicia_en')) : [];
  res.json({ eventos });
});

meRouter.get('/notificaciones', async (req, res) => {
  const notificaciones = ok(
    await db
      .from('notificaciones')
      .select('id, titulo, cuerpo, tipo, datos, leida, creado_en')
      .eq('usuario_id', usuarioDe(req).id)
      .order('creado_en', { ascending: false })
      .limit(50),
  );
  res.json({ notificaciones });
});

meRouter.post('/notificaciones/leer', async (req, res) => {
  const { ids } = body(req, z.object({ ids: z.array(z.string().uuid()).max(100).optional() }));
  let consulta = db.from('notificaciones').update({ leida: true }).eq('usuario_id', usuarioDe(req).id);
  if (ids) consulta = consulta.in('id', ids);
  ok(await consulta);
  res.status(204).end();
});
