"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tramoController_1 = require("../controllers/tramoController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/evento/:eventoId', tramoController_1.listarTramos);
router.post('/', auth_1.authMiddleware, auth_1.adminOnly, tramoController_1.crearTramo);
exports.default = router;
