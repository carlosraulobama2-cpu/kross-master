"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/registro', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Email inválido'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
    (0, express_validator_1.body)('nombre').notEmpty().withMessage('Nombre requerido'),
], authController_1.registrar);
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Email inválido'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password requerido'),
], authController_1.login);
router.get('/perfil', auth_1.authMiddleware, authController_1.perfil);
exports.default = router;
