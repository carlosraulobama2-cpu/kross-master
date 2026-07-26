"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarNotificaciones = listarNotificaciones;
exports.marcarNotificacionLeida = marcarNotificacionLeida;
const supabase_1 = require("../config/supabase");
async function listarNotificaciones(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { data, error } = await supabase_1.supabase
            .from('notificaciones')
            .select('*')
            .eq('usuario_id', usuarioId)
            .order('creado_en', { ascending: false });
        if (error)
            throw error;
        res.json({ notificaciones: data || [] });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al listar notificaciones', error: error.message });
    }
}
async function marcarNotificacionLeida(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('notificaciones')
            .update({ leida: true })
            .eq('id', id)
            .eq('usuario_id', usuarioId)
            .select()
            .single();
        if (error)
            throw error;
        res.json({ notificacion: data });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al marcar notificación', error: error.message });
    }
}
