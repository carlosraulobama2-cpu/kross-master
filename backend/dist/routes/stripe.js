"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const stripeController_1 = require("../controllers/stripeController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/crear-intento-pago', [
    (0, express_validator_1.body)('monto').isFloat({ min: 0.01 }).withMessage('Monto inválido'),
    (0, express_validator_1.body)('eventoId').notEmpty().withMessage('eventoId requerido'),
    (0, express_validator_1.body)('usuarioId').notEmpty().withMessage('usuarioId requerido'),
], stripeController_1.crearIntentoPago);
router.post('/confirmar-pago', auth_1.authMiddleware, [
    (0, express_validator_1.body)('paymentIntentId').notEmpty().withMessage('paymentIntentId requerido'),
    (0, express_validator_1.body)('eventoId').notEmpty().withMessage('eventoId requerido'),
    (0, express_validator_1.body)('asiento').notEmpty().withMessage('asiento requerido'),
], stripeController_1.confirmarPago);
exports.default = router;
