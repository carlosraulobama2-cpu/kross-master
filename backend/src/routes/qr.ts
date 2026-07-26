import { Router } from 'express';
import { body } from 'express-validator';
import { validarQr } from '../controllers/qrController';

const router = Router();

router.post('/validar', [
  body('codigo_qr').notEmpty().withMessage('codigo_qr es requerido'),
], validarQr);

export default router;
