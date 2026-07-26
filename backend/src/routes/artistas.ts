import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/onboarding', authMiddleware, async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.id;
    const { data, error } = await supabase
      .from('usuarios')
      .select('razon_social, dni_cif, datos_bancarios, stripe_connect_account_id')
      .eq('id', usuarioId)
      .single();

    if (error) throw error;
    res.json({ datos: data || {} });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener onboarding', error: (error as Error).message });
  }
});

router.patch('/onboarding', authMiddleware, [
  body('razon_social').optional().notEmpty(),
  body('dni_cif').optional().notEmpty(),
], async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.id;
    const { razon_social, dni_cif } = req.body;

    const { data, error } = await supabase
      .from('usuarios')
      .update({ razon_social, dni_cif, actualizado_en: new Date().toISOString() })
      .eq('id', usuarioId)
      .select('id, email, nombre, rol, razon_social, dni_cif, stripe_connect_account_id')
      .single();

    if (error) throw error;
    res.json({ usuario: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar onboarding', error: (error as Error).message });
  }
});

router.post('/stripe-connect/account', authMiddleware, async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.id;
    const { email, nombre } = req.body;

    const stripe = require('stripe');
    const account = await stripe(process.env.STRIPE_SECRET_KEY).accounts.create({
      type: 'express',
      email,
      business_type: 'individual',
      metadata: { usuario_id: usuarioId },
    });

    const accountLink = await stripe(process.env.STRIPE_SECRET_KEY).accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.EXPO_PUBLIC_BACKEND_URL}/stripe-connect/refresh`,
      return_url: `${process.env.EXPO_PUBLIC_BACKEND_URL}/stripe-connect/complete`,
      type: 'account_onboarding',
    });

    res.json({ accountId: account.id, url: accountLink.url });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear cuenta Stripe Connect', error: (error as Error).message });
  }
});

router.get('/stripe-connect/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const usuarioId = (req as any).usuario.id;
    const { data, error } = await supabase
      .from('usuarios')
      .select('stripe_connect_account_id')
      .eq('id', usuarioId)
      .single();

    if (error || !data?.stripe_connect_account_id) {
      return res.json({ conectado: false });
    }

    const stripe = require('stripe');
    const account = await stripe(process.env.STRIPE_SECRET_KEY).accounts.retrieve(data.stripe_connect_account_id);
    res.json({ conectado: true, detalles: account });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al verificar estado Stripe', error: (error as Error).message });
  }
});

export default router;
