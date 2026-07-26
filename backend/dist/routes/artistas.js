"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/onboarding', auth_1.authMiddleware, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { data, error } = await supabase_1.supabase
            .from('usuarios')
            .select('razon_social, dni_cif, datos_bancarios, stripe_connect_account_id')
            .eq('id', usuarioId)
            .single();
        if (error)
            throw error;
        res.json({ datos: data || {} });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener onboarding', error: error.message });
    }
});
router.patch('/onboarding', auth_1.authMiddleware, [
    (0, express_validator_1.body)('razon_social').optional().notEmpty(),
    (0, express_validator_1.body)('dni_cif').optional().notEmpty(),
], async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { razon_social, dni_cif } = req.body;
        const { data, error } = await supabase_1.supabase
            .from('usuarios')
            .update({ razon_social, dni_cif, actualizado_en: new Date().toISOString() })
            .eq('id', usuarioId)
            .select('id, email, nombre, rol, razon_social, dni_cif, stripe_connect_account_id')
            .single();
        if (error)
            throw error;
        res.json({ usuario: data });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar onboarding', error: error.message });
    }
});
router.post('/stripe-connect/account', auth_1.authMiddleware, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { email, nombre } = req.body;
        const stripe = require('stripe');
        const account = await stripe(process.env.STRIPE_SECRET_KEY).accounts.create({
            type: 'express',
            email,
            business_type: 'individual',
            metadata: { usuario_id: usuarioId },
        });
        const accountLink = await stripe(process.env.STRIPE_SECRET_KEY).accountLinks.create({
            account: account.id,
            refresh_url: `${process.env.EXPO_PUBLIC_BACKEND_URL}/stripe-connect/refresh`,
            return_url: `${process.env.EXPO_PUBLIC_BACKEND_URL}/stripe-connect/complete`,
            type: 'account_onboarding',
        });
        res.json({ accountId: account.id, url: accountLink.url });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al crear cuenta Stripe Connect', error: error.message });
    }
});
router.get('/stripe-connect/status', auth_1.authMiddleware, async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { data, error } = await supabase_1.supabase
            .from('usuarios')
            .select('stripe_connect_account_id')
            .eq('id', usuarioId)
            .single();
        if (error || !data?.stripe_connect_account_id) {
            return res.json({ conectado: false });
        }
        const stripe = require('stripe');
        const account = await stripe(process.env.STRIPE_SECRET_KEY).accounts.retrieve(data.stripe_connect_account_id);
        res.json({ conectado: true, detalles: account });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al verificar estado Stripe', error: error.message });
    }
});
exports.default = router;
