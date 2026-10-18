import { Router } from 'express';
import { body } from 'express-validator';
import { registrar, login, perfil } from './auth.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';


const router = Router();

router.post('/registro', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  body('nombre').notEmpty().withMessage('Nombre requerido'),
], validate, registrar);

router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Password requerido'),
], validate, login);

router.get('/perfil', authMiddleware, perfil);

export default router;
