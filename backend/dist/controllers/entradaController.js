"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarMisEntradas = listarMisEntradas;
const supabase_1 = require("../config/supabase");
async function listarMisEntradas(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { data, error } = await supabase_1.supabase
            .from('entradas')
            .select(`
        *,
        eventos:titulo, lugar, fecha_evento, imagen_url
      `)
            .eq('usuario_id', usuarioId)
            .order('creado_en', { ascending: false });
        if (error)
            throw error;
        res.json({ entradas: data || [] });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al listar entradas', error: error.message });
    }
}
