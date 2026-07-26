import { Router } from 'express';
import { body } from 'express-validator';
import { aceptarTerminos, verificarAceptacion } from '../controllers/terminoController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/aceptar', authMiddleware, [
  body('version').notEmpty().withMessage('version requerida'),
], aceptarTerminos);

router.get('/verificar', authMiddleware, verificarAceptacion);

export default router;
