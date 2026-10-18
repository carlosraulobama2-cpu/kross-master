import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../../common/async-handler';
import { authMiddleware } from '../../middleware/auth';
import { scanLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import { validarQr } from './checkin.controller';

const router = Router();

// Antes era pública: cualquiera podía «gastar» entradas ajenas. Ahora exige sesión de staff, artista del evento o admin.
router.post('/validar', scanLimiter, authMiddleware, [body('codigo_qr').isString().notEmpty().withMessage('codigo_qr es requerido')], validate, asyncHandler(validarQr));

export default router;
