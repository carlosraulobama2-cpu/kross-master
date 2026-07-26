import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { stripe } from '../config/stripe';
import { supabase } from '../config/supabase';
import { crearIntentoPago, confirmarPago } from '../controllers/stripeController';
import { buildQrPayload } from '../utils/qrSigner';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/crear-intento-pago', [
  body('monto').isFloat({ min: 0.01 }).withMessage('Monto inválido'),
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
  body('usuarioId').notEmpty().withMessage('usuarioId requerido'),
], crearIntentoPago);

router.post('/confirmar-pago', authMiddleware, [
  body('paymentIntentId').notEmpty().withMessage('paymentIntentId requerido'),
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
  body('asiento').notEmpty().withMessage('asiento requerido'),
], confirmarPago);

export default router;
