"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarQr = validarQr;
const supabase_1 = require("../config/supabase");
const qrSigner_1 = require("../utils/qrSigner");
async function validarQr(req, res) {
    try {
        const { codigo_qr, codigo_acceso, usuario_id } = req.body;
        if (!codigo_qr) {
            return res.status(400).json({ mensaje: 'codigo_qr es requerido' });
        }
        const datosQr = (0, qrSigner_1.parsearQr)(codigo_qr);
        if (!datosQr) {
            return res.status(400).json({ mensaje: 'QR inválido' });
        }
        if (!datosQr.ticket_id || !datosQr.event_id || !datosQr.nonce || !datosQr.exp) {
            return res.status(400).json({ mensaje: 'QR con formato inválido' });
        }
        if ((0, qrSigner_1.esQrExpirado)(datosQr)) {
            return res.status(400).json({ mensaje: 'QR expirado, solicita uno nuevo' });
        }
        const { data: nonceUsado } = await supabase_1.supabase
            .from('qr_nonces')
            .select('id')
            .eq('nonce', datosQr.nonce)
            .single();
        if (nonceUsado) {
            return res.status(400).json({ mensaje: 'QR ya fue escaneado' });
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
        let escaneadoPor = null;
        if (codigo_acceso && usuario_id) {
            const { data: staff } = await supabase_1.supabase
                .from('staff_evento')
                .select('id')
                .eq('evento_id', entrada.evento_id)
                .eq('usuario_id', usuario_id)
                .eq('autorizado', true)
                .single();
            if (staff) {
                escaneadoPor = usuario_id;
            }
        }
        await supabase_1.supabase.from('qr_nonces').insert([{ nonce: datosQr.nonce, ticket_id: datosQr.ticket_id, evento_id: datosQr.event_id }]);
        const { error: updateError } = await supabase_1.supabase
            .from('entradas')
            .update({
            estado: 'USADO',
            fecha_escaneo: new Date().toISOString(),
            escaneado_por: escaneadoPor,
        })
            .eq('id', entrada.id);
        if (updateError) {
            return res.status(500).json({ mensaje: 'Error al actualizar la entrada', error: updateError.message });
        }
        await supabase_1.supabase
            .from('accesos')
            .insert([{
                entrada_id: entrada.id,
                evento_id: entrada.evento_id,
                usuario_id: entrada.usuario_id,
                tipo_acceso: 'entrada',
                metodo_verificacion: 'qr',
                dispositivo_info: req.body.dispositivo_info || {},
            }]);
        res.json({ mensaje: 'Entrada válida y marcada como usada', entrada: { ...entrada, estado: 'USADO', escaneado_por: escaneadoPor } });
    }
    catch (error) {
        res.status(500).json({ mensaje: 'Error al validar QR', error: error.message });
    }
}
