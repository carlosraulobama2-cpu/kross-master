"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const resenaController_1 = require("../controllers/resenaController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authMiddleware, [
    (0, express_validator_1.body)('eventoId').notEmpty().withMessage('eventoId requerido'),
    (0, express_validator_1.body)('calificacion').isInt({ min: 1, max: 5 }).withMessage('Calificación inválida'),
], resenaController_1.crearResena);
router.get('/evento/:eventoId', resenaController_1.listarResenas);
exports.default = router;
