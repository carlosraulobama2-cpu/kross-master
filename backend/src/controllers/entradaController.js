const { obtenerEntradasPorUsuario } = require('../models/Entrada');
const { getDb } = require('../config/database');

async function listarMisEntradas(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const db = await getDb();
    const entradas = await obtenerEntradasPorUsuario(db, usuarioId);
    res.json({ entradas });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar entradas', error: error.message });
  }
}

module.exports = {
  listarMisEntradas,
};
