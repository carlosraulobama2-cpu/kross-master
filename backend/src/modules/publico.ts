import { Router } from 'express';
import { db, ok } from '../lib/supabase';

/** Configuración que la app necesita antes de iniciar sesión. */
export const publicoRouter = Router();

publicoRouter.get('/config', async (_req, res) => {
  const cfg = ok(
    await db
      .from('configuracion')
      .select('gastos_gestion_porcentaje, gastos_gestion_fijo_centimos, seguro_porcentaje, minutos_reserva, moneda, registro_abierto, mantenimiento, mensaje_mantenimiento, email_soporte')
      .eq('id', 1)
      .single(),
  );
  res.set('Cache-Control', 'public, max-age=60').json({ config: cfg });
});
