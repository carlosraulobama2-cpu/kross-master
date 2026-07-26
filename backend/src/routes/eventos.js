const express = require('express');
const { body } = require('express-validator');
const { crear, listar, obtener, comprar } = require('../controllers/eventoController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', listar);
router.get('/:id', obtener);

router.post('/', authMiddleware, adminOnly, [
  body('titulo').notEmpty().withMessage('Titulo requerido'),
  body('fecha_evento').notEmpty().withMessage('Fecha evento requerida'),
  body('precio').isFloat({ min: 0 }).withMessage('Precio inválido'),
  body('aforo_total').isInt({ min: 1 }).withMessage('Aforo total inválido'),
], crear);

router.post('/:id/comprar', authMiddleware, comprar);

module.exports = router;
