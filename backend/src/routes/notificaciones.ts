import { Router } from 'express';
import { listarNotificaciones, marcarNotificacionLeida } from '../controllers/notificacionController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, listarNotificaciones);
router.patch('/:id/leer', authMiddleware, marcarNotificacionLeida);

export default router;
