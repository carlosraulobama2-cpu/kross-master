"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
require('dotenv').config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const eventos_1 = __importDefault(require("./routes/eventos"));
const entradas_1 = __importDefault(require("./routes/entradas"));
const qr_1 = __importDefault(require("./routes/qr"));
const stripe_1 = __importDefault(require("./routes/stripe"));
const stripeWebhook_1 = __importDefault(require("./routes/stripeWebhook"));
const usuarios_1 = __importDefault(require("./routes/usuarios"));
const favoritos_1 = __importDefault(require("./routes/favoritos"));
const resenas_1 = __importDefault(require("./routes/resenas"));
const notificaciones_1 = __importDefault(require("./routes/notificaciones"));
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'kroos-master-backend' });
});
app.use('/api/auth', auth_1.default);
app.use('/api/eventos', eventos_1.default);
app.use('/api/entradas', entradas_1.default);
app.use('/api/qr', qr_1.default);
app.use('/api/stripe', stripe_1.default);
app.use('/api/stripe/webhook', stripeWebhook_1.default);
app.use('/api/usuarios', usuarios_1.default);
app.use('/api/favoritos', favoritos_1.default);
app.use('/api/resenas', resenas_1.default);
app.use('/api/notificaciones', notificaciones_1.default);
app.use((_req, res) => {
    res.status(404).json({ mensaje: 'Ruta no encontrada' });
});
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
exports.server = server;
