"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificacionController_1 = require("../controllers/notificacionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authMiddleware, notificacionController_1.listarNotificaciones);
router.patch('/:id/leer', auth_1.authMiddleware, notificacionController_1.marcarNotificacionLeida);
exports.default = router;
