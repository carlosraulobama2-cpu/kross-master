"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearTramo = crearTramo;
exports.listarTramos = listarTramos;
const supabase_1 = require("../config/supabase");
async function crearTramo(req, res) {
    try {
        const artistaId = req.usuario.id;
        const { eventoId, nombre, precio, aforo_total, orden } = req.body;
        const { data: evento, error: eventoError } = await supabase_1.supabase
            .from('eventos')
            .select('id, artista_id')
            .eq('id', eventoId)
            .single();
        if (eventoError || !evento || evento.artista_id !== artistaId) {
            return res.status(403).json({ mensaje: 'No autorizado para este evento' });
        }
        const { data, error } = await supabase_1.supabase
            .from('tramos_entrada')
            .insert([{
                evento_id: eventoId,
                nombre,
                precio,
                aforo_total,
                entradas_disponibles: aforo_total,
                orden: orden || 0,
                activo: true,
            }])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ tramo: data });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al crear tramo', error: error.message });
    }
}
async function listarTramos(req, res) {
    try {
        const { eventoId } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('tramos_entrada')
            .select('*')
            .eq('evento_id', eventoId)
            .order('orden', { ascending: true });
        if (error)
            throw error;
        res.json({ tramos: data || [] });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al listar tramos', error: error.message });
    }
}
