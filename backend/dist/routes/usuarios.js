"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const usuarioController_1 = require("../controllers/usuarioController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.patch('/perfil', auth_1.authMiddleware, usuarioController_1.actualizarPerfil);
exports.default = router;
