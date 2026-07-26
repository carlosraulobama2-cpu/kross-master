"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminOnly = adminOnly;
const supabase_1 = require("../config/supabase");
async function authMiddleware(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        _res.status(401).json({ mensaje: 'Token no proporcionado' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const { data, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !data.user) {
            _res.status(401).json({ mensaje: 'Token inválido o expirado' });
            return;
        }
        const { data: usuario } = await supabase_1.supabase
            .from('usuarios')
            .select('id, email, nombre, rol')
            .eq('id', data.user.id)
            .single();
        if (!usuario) {
            _res.status(401).json({ mensaje: 'Usuario no encontrado' });
            return;
        }
        req.usuario = usuario;
        next();
    }
    catch (error) {
        _res.status(401).json({ mensaje: 'Token inválido o expirado' });
    }
}
function adminOnly(req, res, next) {
    if (req.usuario?.rol !== 'super_admin') {
        res.status(403).json({ mensaje: 'Acceso denegado. Se requiere rol super_admin.' });
        return;
    }
    next();
}
