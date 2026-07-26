import { Router } from 'express';
import { body } from 'express-validator';
import { crear, listar, obtener, comprar } from '../controllers/eventoController';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();

router.get('/', listar);
router.get('/:id', obtener);

router.post('/', authMiddleware, adminOnly, [
  body('titulo').notEmpty().withMessage('Titulo requerido'),
  body('fecha_evento').notEmpty().withMessage('Fecha evento requerida'),
  body('precio').isFloat({ min: 0 }).withMessage('Precio inválido'),
  body('aforo_total').isInt({ min: 1 }).withMessage('Aforo total inválido'),
], crear);

router.post('/:id/comprar', authMiddleware, comprar);

export default router;
