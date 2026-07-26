"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
exports.generarToken = generarToken;
exports.verificarToken = verificarToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'KROOS_MASTER_SECRET_2026';
exports.JWT_SECRET = JWT_SECRET;
const JWT_EXPIRES = '7d';
function generarToken(usuario) {
    return jsonwebtoken_1.default.sign({ id: usuario.id, email: usuario.email, rol: usuario.rol }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}
function verificarToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
