import { Router } from 'express';
import { body } from 'express-validator';
import { crearReserva, cancelarReserva } from '../controllers/reservaController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, [
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
  body('tramoId').notEmpty().withMessage('tramoId requerido'),
  body('cantidad').optional().isInt({ min: 1 }).withMessage('Cantidad inválida'),
], crearReserva);

router.delete('/:id', authMiddleware, cancelarReserva);

export default router;
