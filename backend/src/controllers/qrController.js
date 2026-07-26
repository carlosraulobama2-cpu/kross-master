const { obtenerEntradaPorCodigoQr, marcarEntradaComoUsada } = require('../models/Entrada');
const { getDb, saveDb } = require('../config/database');
const { parsearQr } = require('../utils/qrSigner');

async function validarQr(req, res) {
  try {
    const { codigo_qr } = req.body;
    if (!codigo_qr) {
      return res.status(400).json({ mensaje: 'codigo_qr es requerido' });
    }

    const datosQr = parsearQr(codigo_qr);
    if (!datosQr) {
      return res.status(400).json({ mensaje: 'QR inválido' });
    }

    const db = await getDb();
    const entrada = await obtenerEntradaPorCodigoQr(db, codigo_qr);
    if (!entrada) {
      return res.status(404).json({ mensaje: 'Entrada no encontrada' });
    }

    if (entrada.estado === 'USADO') {
      return res.status(409).json({ mensaje: 'Esta entrada ya fue usada', entrada });
    }

    await marcarEntradaComoUsada(db, entrada.id);
    await saveDb(db);

    res.json({ mensaje: 'Entrada válida y marcada como usada', entrada });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al validar QR', error: error.message });
  }
}

module.exports = {
  validarQr,
};
