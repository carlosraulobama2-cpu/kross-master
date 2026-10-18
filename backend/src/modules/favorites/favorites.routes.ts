import { Router } from 'express';
import { body } from 'express-validator';
import { agregarFavorito, quitarFavorito, listarFavoritos } from './favorites.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';


const router = Router();

router.post('/agregar', authMiddleware, [
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
], validate, agregarFavorito);

router.post('/quitar', authMiddleware, [
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
], validate, quitarFavorito);

router.get('/mis-favoritos', authMiddleware, listarFavoritos);

export default router;
