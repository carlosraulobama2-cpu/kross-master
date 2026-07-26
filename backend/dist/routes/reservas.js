"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const reservaController_1 = require("../controllers/reservaController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authMiddleware, [
    (0, express_validator_1.body)('eventoId').notEmpty().withMessage('eventoId requerido'),
    (0, express_validator_1.body)('tramoId').notEmpty().withMessage('tramoId requerido'),
    (0, express_validator_1.body)('cantidad').optional().isInt({ min: 1 }).withMessage('Cantidad inválida'),
], reservaController_1.crearReserva);
router.delete('/:id', auth_1.authMiddleware, reservaController_1.cancelarReserva);
exports.default = router;
