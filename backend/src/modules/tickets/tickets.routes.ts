import { Router } from 'express';
import { listarMisEntradas } from './tickets.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.get('/mis-entradas', authMiddleware, listarMisEntradas);

export default router;
