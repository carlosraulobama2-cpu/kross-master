"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearResena = crearResena;
exports.listarResenas = listarResenas;
const supabase_1 = require("../config/supabase");
async function crearResena(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { eventoId, calificacion, comentario } = req.body;
        const { data, error } = await supabase_1.supabase
            .from('resenas')
            .insert([{
                usuario_id: usuarioId,
                evento_id: eventoId,
                calificacion,
                comentario,
            }])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ resena: data });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al crear reseña', error: error.message });
    }
}
async function listarResenas(req, res) {
    try {
        const { eventoId } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('resenas')
            .select(`
        *,
        usuarios:usuario_id(nombre, nombre_artistico)
      `)
            .eq('evento_id', eventoId)
            .order('creado_en', { ascending: false });
        if (error)
            throw error;
        res.json({ resenas: data || [] });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al listar reseñas', error: error.message });
    }
}
