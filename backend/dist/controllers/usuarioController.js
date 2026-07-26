"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualizarPerfil = actualizarPerfil;
const supabase_1 = require("../config/supabase");
async function actualizarPerfil(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { nombre, nombre_artistico, bio, telefono, sitio_web, foto_perfil, imagen_url, } = req.body;
        const updateData = { actualizado_en: new Date().toISOString() };
        if (nombre !== undefined)
            updateData.nombre = nombre;
        if (nombre_artistico !== undefined)
            updateData.nombre_artistico = nombre_artistico;
        if (bio !== undefined)
            updateData.bio = bio;
        if (telefono !== undefined)
            updateData.telefono = telefono;
        if (sitio_web !== undefined)
            updateData.sitio_web = sitio_web;
        if (foto_perfil !== undefined)
            updateData.foto_perfil = foto_perfil;
        if (imagen_url !== undefined)
            updateData.imagen_url = imagen_url;
        const { data, error } = await supabase_1.supabase
            .from('usuarios')
            .update(updateData)
            .eq('id', usuarioId)
            .select('id, email, nombre, rol, nombre_artistico, bio, telefono, sitio_web, foto_perfil, imagen_url, creado_en, actualizado_en')
            .single();
        if (error || !data) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        res.json({ usuario: data });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar perfil', error: error.message });
    }
}
