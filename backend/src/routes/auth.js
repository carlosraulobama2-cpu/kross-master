const express = require('express');
const { body } = require('express-validator');
const { registrar, login, perfil } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;
