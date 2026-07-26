import { Router } from 'express';
import { body } from 'express-validator';
import { registrarAcceso, obtenerAnalyticsEvento } from '../controllers/analyticsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/acceso', authMiddleware, [
  body('entradaId').notEmpty().withMessage('entradaId requerido'),
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
], registrarAcceso);

router.get('/evento/:eventoId', authMiddleware, obtenerAnalyticsEvento);

export default router;
