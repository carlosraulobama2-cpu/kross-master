import { Router } from 'express';
import { body } from 'express-validator';
import { registrarAcceso, obtenerAnalyticsEvento } from './analytics.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';


const router = Router();

router.post('/acceso', authMiddleware, [
  body('entradaId').notEmpty().withMessage('entradaId requerido'),
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
], validate, registrarAcceso);

router.get('/evento/:eventoId', authMiddleware, obtenerAnalyticsEvento);

export default router;
