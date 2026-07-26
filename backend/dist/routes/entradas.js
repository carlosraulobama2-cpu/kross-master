"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const entradaController_1 = require("../controllers/entradaController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/mis-entradas', auth_1.authMiddleware, entradaController_1.listarMisEntradas);
exports.default = router;
