import { Router } from 'express';
import { body } from 'express-validator';
import { crearResena, listarResenas } from './reviews.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';


const router = Router();

router.post('/', authMiddleware, [
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
  body('calificacion').isInt({ min: 1, max: 5 }).withMessage('Calificación inválida'),
], validate, crearResena);

router.get('/evento/:eventoId', listarResenas);

export default router;
