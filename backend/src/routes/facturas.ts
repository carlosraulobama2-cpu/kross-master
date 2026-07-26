import { Router } from 'express';
import { body } from 'express-validator';
import { crearFactura } from '../controllers/facturaController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, [
  body('entradaId').notEmpty().withMessage('entradaId requerido'),
], crearFactura);

export default router;
