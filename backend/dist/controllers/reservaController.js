"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearReserva = crearReserva;
exports.cancelarReserva = cancelarReserva;
const supabase_1 = require("../config/supabase");
async function crearReserva(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { eventoId, tramoId, asiento, cantidad = 1 } = req.body;
        const minutosExpiracion = 10;
        const expiraEn = new Date();
        expiraEn.setMinutes(expiraEn.getMinutes() + minutosExpiracion);
        const { data: tramo, error: tramoError } = await supabase_1.supabase
            .from('tramos_entrada')
            .select('precio, entradas_disponibles, aforo_total')
            .eq('id', tramoId)
            .eq('evento_id', eventoId)
            .single();
        if (tramoError || !tramo) {
            return res.status(404).json({ mensaje: 'Tramo no encontrado' });
        }
        if (tramo.entradas_disponibles < cantidad) {
            return res.status(409).json({ mensaje: 'No hay entradas suficientes' });
        }
        const codigoReserva = `RES-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
        const precioTotal = tramo.precio * cantidad;
        const { data: reserva, error } = await supabase_1.supabase
            .from('reservas')
            .insert([{
                evento_id: eventoId,
                tramo_id: tramoId,
                usuario_id: usuarioId,
                codigo_reserva: codigoReserva,
                asiento,
                cantidad,
                precio_total: precioTotal,
                estado: 'activa',
                expira_en: expiraEn.toISOString(),
            }])
            .select()
            .single();
        if (error)
            throw error;
        await supabase_1.supabase.rpc('incrementar_reserva', {
            p_evento_id: eventoId,
            p_tramo_id: tramoId,
            p_cantidad: cantidad,
        });
        res.status(201).json({ reserva });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al crear reserva', error: error.message });
    }
}
async function cancelarReserva(req, res) {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;
        const { data: reserva, error } = await supabase_1.supabase
            .from('reservas')
            .select('*')
            .eq('id', id)
            .eq('usuario_id', usuarioId)
            .single();
        if (error || !reserva) {
            return res.status(404).json({ mensaje: 'Reserva no encontrada' });
        }
        if (reserva.estado !== 'activa') {
            return res.status(400).json({ mensaje: 'Reserva no activa' });
        }
        const { error: updateError } = await supabase_1.supabase
            .from('reservas')
            .update({ estado: 'cancelada' })
            .eq('id', id);
        if (updateError)
            throw updateError;
        await supabase_1.supabase.rpc('decrementar_reserva', {
            p_evento_id: reserva.evento_id,
            p_tramo_id: reserva.tramo_id,
            p_cantidad: reserva.cantidad,
        });
        res.json({ mensaje: 'Reserva cancelada' });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al cancelar reserva', error: error.message });
    }
}
