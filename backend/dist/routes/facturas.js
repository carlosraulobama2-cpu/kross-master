"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const facturaController_1 = require("../controllers/facturaController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authMiddleware, [
    (0, express_validator_1.body)('entradaId').notEmpty().withMessage('entradaId requerido'),
], facturaController_1.crearFactura);
exports.default = router;
