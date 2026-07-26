const express = require('express');
const { listarMisEntradas } = require('../controllers/entradaController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/mis-entradas', authMiddleware, listarMisEntradas);

module.exports = router;
