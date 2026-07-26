"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const qrController_1 = require("../controllers/qrController");
const router = (0, express_1.Router)();
router.post('/validar', [
    (0, express_validator_1.body)('codigo_qr').notEmpty().withMessage('codigo_qr es requerido'),
], qrController_1.validarQr);
exports.default = router;
