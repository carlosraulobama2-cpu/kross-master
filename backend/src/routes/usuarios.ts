import { Router } from 'express';
import { actualizarPerfil } from '../controllers/usuarioController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.patch('/perfil', authMiddleware, actualizarPerfil);

export default router;
