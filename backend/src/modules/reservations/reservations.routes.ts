import { Router } from 'express';
import { body } from 'express-validator';
import { crearReserva, cancelarReserva } from './reservations.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';


const router = Router();

router.post('/', authMiddleware, [
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
  body('tramoId').notEmpty().withMessage('tramoId requerido'),
  body('cantidad').optional().isInt({ min: 1 }).withMessage('Cantidad inválida'),
], validate, crearReserva);

router.delete('/:id', authMiddleware, cancelarReserva);

export default router;
