import { Router } from 'express';
import { body } from 'express-validator';
import { aceptarTerminos, verificarAceptacion } from './terms.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';


const router = Router();

router.post('/aceptar', authMiddleware, [
  body('version').notEmpty().withMessage('version requerida'),
], validate, aceptarTerminos);

router.get('/verificar', authMiddleware, verificarAceptacion);

export default router;
