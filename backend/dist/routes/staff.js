"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/generar', auth_1.authMiddleware, [
    (0, express_validator_1.body)('eventoId').notEmpty().withMessage('eventoId requerido'),
    (0, express_validator_1.body)('codigo').notEmpty().withMessage('codigo requerido'),
    (0, express_validator_1.body)('tipo').optional().isIn(['staff', 'invitado']).withMessage('Tipo inválido'),
], async (req, res) => {
    try {
        const artistaId = req.usuario.id;
        const { eventoId, codigo, tipo = 'staff', usosMaximos, expiraEn } = req.body;
        const { data: evento } = await supabase_1.supabase
            .from('eventos')
            .select('id')
            .eq('id', eventoId)
            .eq('artista_id', artistaId)
            .single();
        if (!evento) {
            return res.status(403).json({ mensaje: 'No autorizado para este evento' });
        }
        const { data, error } = await supabase_1.supabase
            .from('codigos_acceso')
            .insert([{
                evento_id: eventoId,
                codigo,
                tipo,
                usos_maximos: usosMaximos || null,
                expira_en: expiraEn || null,
            }])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ codigoAcceso: data });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al generar código', error: error.message });
    }
});
router.get('/evento/:eventoId', auth_1.authMiddleware, async (req, res) => {
    try {
        const artistaId = req.usuario.id;
        const { eventoId } = req.params;
        const { data: evento } = await supabase_1.supabase
            .from('eventos')
            .select('id')
            .eq('id', eventoId)
            .eq('artista_id', artistaId)
            .single();
        if (!evento) {
            return res.status(403).json({ mensaje: 'No autorizado para este evento' });
        }
        const { data, error } = await supabase_1.supabase
            .from('codigos_acceso')
            .select('*')
            .eq('evento_id', eventoId)
            .order('creado_en', { ascending: false });
        if (error)
            throw error;
        res.json({ codigos: data || [] });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al listar códigos', error: error.message });
    }
});
router.post('/validar', async (req, res) => {
    try {
        const { codigo, eventoId } = req.body;
        const { data: codigoAcceso, error } = await supabase_1.supabase
            .from('codigos_acceso')
            .select('*')
            .eq('codigo', codigo)
            .eq('evento_id', eventoId)
            .eq('activo', true)
            .single();
        if (error || !codigoAcceso) {
            return res.status(404).json({ mensaje: 'Código de acceso inválido' });
        }
        if (codigoAcceso.expira_en && new Date(codigoAcceso.expira_en) < new Date()) {
            return res.status(400).json({ mensaje: 'Código expirado' });
        }
        if (codigoAcceso.usos_maximos && codigoAcceso.usos_actuales >= codigoAcceso.usos_maximos) {
            return res.status(400).json({ mensaje: 'Código sin usos disponibles' });
        }
        res.json({ valido: true, codigoAcceso });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al validar código', error: error.message });
    }
});
router.post('/asignar-staff', auth_1.authMiddleware, [
    (0, express_validator_1.body)('eventoId').notEmpty().withMessage('eventoId requerido'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Email inválido'),
    (0, express_validator_1.body)('rolStaff').optional().isIn(['validador', 'supervisor']).withMessage('Rol inválido'),
], async (req, res) => {
    try {
        const artistaId = req.usuario.id;
        const { eventoId, email, rolStaff = 'validador' } = req.body;
        const { data: evento } = await supabase_1.supabase
            .from('eventos')
            .select('id')
            .eq('id', eventoId)
            .eq('artista_id', artistaId)
            .single();
        if (!evento) {
            return res.status(403).json({ mensaje: 'No autorizado para este evento' });
        }
        const { data: usuarioDestino } = await supabase_1.supabase
            .from('usuarios')
            .select('id')
            .eq('email', email)
            .single();
        if (!usuarioDestino) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        const { data, error } = await supabase_1.supabase
            .from('staff_evento')
            .upsert([{
                evento_id: eventoId,
                usuario_id: usuarioDestino.id,
                rol_staff: rolStaff,
            }])
            .select()
            .single();
        if (error)
            throw error;
        res.json({ staff: data });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al asignar staff', error: error.message });
    }
});
exports.default = router;
