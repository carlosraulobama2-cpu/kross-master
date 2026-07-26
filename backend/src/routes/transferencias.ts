import { Router } from 'express';
import { body } from 'express-validator';
import { crearTransferencia, aceptarTransferencia } from '../controllers/transferenciaController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, [
  body('entradaId').notEmpty().withMessage('entradaId requerido'),
  body('emailDestino').isEmail().withMessage('Email destino inválido'),
], crearTransferencia);

router.post('/aceptar', authMiddleware, [
  body('codigoTransferencia').notEmpty().withMessage('codigoTransferencia requerido'),
], aceptarTransferencia);

export default router;
