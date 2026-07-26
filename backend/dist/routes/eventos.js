"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const eventoController_1 = require("../controllers/eventoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', eventoController_1.listar);
router.get('/:id', eventoController_1.obtener);
router.post('/', auth_1.authMiddleware, auth_1.adminOnly, [
    (0, express_validator_1.body)('titulo').notEmpty().withMessage('Titulo requerido'),
    (0, express_validator_1.body)('fecha_evento').notEmpty().withMessage('Fecha evento requerida'),
    (0, express_validator_1.body)('precio').isFloat({ min: 0 }).withMessage('Precio inválido'),
    (0, express_validator_1.body)('aforo_total').isInt({ min: 1 }).withMessage('Aforo total inválido'),
], eventoController_1.crear);
router.post('/:id/comprar', auth_1.authMiddleware, eventoController_1.comprar);
exports.default = router;
