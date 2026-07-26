import { Router } from 'express';
import { crearTramo, listarTramos } from '../controllers/tramoController';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();

router.get('/evento/:eventoId', listarTramos);
router.post('/', authMiddleware, adminOnly, crearTramo);

export default router;
