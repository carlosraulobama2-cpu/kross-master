"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const analyticsController_1 = require("../controllers/analyticsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/acceso', auth_1.authMiddleware, [
    (0, express_validator_1.body)('entradaId').notEmpty().withMessage('entradaId requerido'),
    (0, express_validator_1.body)('eventoId').notEmpty().withMessage('eventoId requerido'),
], analyticsController_1.registrarAcceso);
router.get('/evento/:eventoId', auth_1.authMiddleware, analyticsController_1.obtenerAnalyticsEvento);
exports.default = router;
