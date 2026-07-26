"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agregarFavorito = agregarFavorito;
exports.quitarFavorito = quitarFavorito;
exports.listarFavoritos = listarFavoritos;
const supabase_1 = require("../config/supabase");
async function agregarFavorito(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { eventoId } = req.body;
        const { data, error } = await supabase_1.supabase
            .from('favoritos')
            .insert([{ usuario_id: usuarioId, evento_id: eventoId }])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ favorito: data });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al agregar favorito', error: error.message });
    }
}
async function quitarFavorito(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { eventoId } = req.body;
        const { error } = await supabase_1.supabase
            .from('favoritos')
            .delete()
            .eq('usuario_id', usuarioId)
            .eq('evento_id', eventoId);
        if (error)
            throw error;
        res.json({ mensaje: 'Favorito eliminado' });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al quitar favorito', error: error.message });
    }
}
async function listarFavoritos(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { data, error } = await supabase_1.supabase
            .from('favoritos')
            .select(`
        *,
        eventos:evento_id(*)
      `)
            .eq('usuario_id', usuarioId)
            .order('creado_en', { ascending: false });
        if (error)
            throw error;
        res.json({ favoritos: data || [] });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al listar favoritos', error: error.message });
    }
}
