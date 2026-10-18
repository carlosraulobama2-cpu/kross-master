import { Router } from 'express';
import { body } from 'express-validator';
import { crearTransferencia, aceptarTransferencia } from './transfers.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';


const router = Router();

router.post('/', authMiddleware, [
  body('entradaId').notEmpty().withMessage('entradaId requerido'),
  body('emailDestino').isEmail().withMessage('Email destino inválido'),
], validate, crearTransferencia);

router.post('/aceptar', authMiddleware, [
  body('codigoTransferencia').notEmpty().withMessage('codigoTransferencia requerido'),
], validate, aceptarTransferencia);

export default router;
