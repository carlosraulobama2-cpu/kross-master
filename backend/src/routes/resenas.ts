import { Router } from 'express';
import { body } from 'express-validator';
import { crearResena, listarResenas } from '../controllers/resenaController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, [
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
  body('calificacion').isInt({ min: 1, max: 5 }).withMessage('Calificación inválida'),
], crearResena);

router.get('/evento/:eventoId', listarResenas);

export default router;
