import { Router } from 'express';
import { body } from 'express-validator';
import { agregarFavorito, quitarFavorito, listarFavoritos } from '../controllers/favoritoController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/agregar', authMiddleware, [
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
], agregarFavorito);

router.post('/quitar', authMiddleware, [
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
], quitarFavorito);

router.get('/mis-favoritos', authMiddleware, listarFavoritos);

export default router;
