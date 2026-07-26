"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const transferenciaController_1 = require("../controllers/transferenciaController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authMiddleware, [
    (0, express_validator_1.body)('entradaId').notEmpty().withMessage('entradaId requerido'),
    (0, express_validator_1.body)('emailDestino').isEmail().withMessage('Email destino inválido'),
], transferenciaController_1.crearTransferencia);
router.post('/aceptar', auth_1.authMiddleware, [
    (0, express_validator_1.body)('codigoTransferencia').notEmpty().withMessage('codigoTransferencia requerido'),
], transferenciaController_1.aceptarTransferencia);
exports.default = router;
