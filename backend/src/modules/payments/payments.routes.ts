import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../../common/async-handler';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { confirmarPago, crearIntentoPago } from './payments.controller';

const router = Router();

router.post(
  '/crear-intento-pago',
  authMiddleware,
  [body('eventoId').notEmpty().withMessage('eventoId requerido'), body('asiento').optional().isString().isLength({ max: 40 })],
  validate,
  asyncHandler(crearIntentoPago),
);

router.post(
  '/confirmar-pago',
  authMiddleware,
  [body('paymentIntentId').isString().matches(/^pi_/).withMessage('paymentIntentId inválido'), body('eventoId').notEmpty().withMessage('eventoId requerido')],
  validate,
  asyncHandler(confirmarPago),
);

export default router;
