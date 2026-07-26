"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const favoritoController_1 = require("../controllers/favoritoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/agregar', auth_1.authMiddleware, [
    (0, express_validator_1.body)('eventoId').notEmpty().withMessage('eventoId requerido'),
], favoritoController_1.agregarFavorito);
router.post('/quitar', auth_1.authMiddleware, [
    (0, express_validator_1.body)('eventoId').notEmpty().withMessage('eventoId requerido'),
], favoritoController_1.quitarFavorito);
router.get('/mis-favoritos', auth_1.authMiddleware, favoritoController_1.listarFavoritos);
exports.default = router;
