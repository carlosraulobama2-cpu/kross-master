import { Router } from 'express';
import { listarMisEntradas } from '../controllers/entradaController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/mis-entradas', authMiddleware, listarMisEntradas);

export default router;
