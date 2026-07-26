import { Router } from 'express';
import { body } from 'express-validator';
import { registrar, login, perfil } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/registro', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  body('nombre').notEmpty().withMessage('Nombre requerido'),
], registrar);

router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Password requerido'),
], login);

router.get('/perfil', authMiddleware, perfil);

export default router;
