"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarQr = validarQr;
const supabase_1 = require("../config/supabase");
const qrSigner_1 = require("../utils/qrSigner");
async function validarQr(req, res) {
    try {
        const { codigo_qr } = req.body;
        if (!codigo_qr) {
            return res.status(400).json({ mensaje: 'codigo_qr es requerido' });
        }
        const datosQr = (0, qrSigner_1.parsearQr)(codigo_qr);
        if (!datosQr) {
            return res.status(400).json({ mensaje: 'QR inválido' });
        }
        const { data: entrada, error } = await supabase_1.supabase
            .from('entradas')
            .select('*')
            .eq('codigo_qr', codigo_qr)
            .single();
        if (error || !entrada) {
            return res.status(404).json({ mensaje: 'Entrada no encontrada' });
        }
        if (entrada.estado === 'USADO') {
            return res.status(409).json({ mensaje: 'Esta entrada ya fue usada', entrada });
        }
        const { error: updateError } = await supabase_1.supabase
            .from('entradas')
            .update({ estado: 'USADO', fecha_escaneo: new Date().toISOString() })
            .eq('id', entrada.id);
        if (updateError) {
            return res.status(500).json({ mensaje: 'Error al actualizar la entrada', error: updateError.message });
        }
        res.json({ mensaje: 'Entrada válida y marcada como usada', entrada: { ...entrada, estado: 'USADO' } });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al validar QR', error: error.message });
    }
}
