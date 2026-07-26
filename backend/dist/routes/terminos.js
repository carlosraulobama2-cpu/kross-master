"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const terminoController_1 = require("../controllers/terminoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/aceptar', auth_1.authMiddleware, [
    (0, express_validator_1.body)('version').notEmpty().withMessage('version requerida'),
], terminoController_1.aceptarTerminos);
router.get('/verificar', auth_1.authMiddleware, terminoController_1.verificarAceptacion);
exports.default = router;
