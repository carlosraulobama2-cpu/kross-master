import { Router } from 'express';
import { actualizarPerfil } from './users.controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

router.patch('/perfil', authMiddleware, actualizarPerfil);

export default router;
