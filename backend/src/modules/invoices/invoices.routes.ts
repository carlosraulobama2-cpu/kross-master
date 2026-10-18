import { Router } from 'express';
import { body } from 'express-validator';
import { crearFactura } from './invoices.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';


const router = Router();

router.post('/', authMiddleware, [
  body('entradaId').notEmpty().withMessage('entradaId requerido'),
], validate, crearFactura);

export default router;
