const { v4: uuidv4 } = require('uuid');
const { crearEvento, listarEventos, obtenerEventoPorId, actualizarEntradasDisponibles } = require('../models/Evento');
const { getDb, saveDb } = require('../config/database');

async function crear(req, res) {
  try {
    const { titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, imagen_url } = req.body;
    if (!titulo || !fecha_evento || !precio || !aforo_total) {
      return res.status(400).json({ mensaje: 'titulo, fecha_evento, precio y aforo_total son requeridos' });
    }

    const db = await getDb();
    const evento = await crearEvento(db, { titulo, descripcion, lugar, categoria, fecha_evento, precio, aforo_total, imagen_url });
    await saveDb(db);
    res.status(201).json({ evento });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear evento', error: error.message });
  }
}

async function listar(req, res) {
  try {
    const { categoria } = req.query;
    const db = await getDb();
    const eventos = await listarEventos(db, { categoria });
    res.json({ eventos });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar eventos', error: error.message });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const db = await getDb();
    const evento = await obtenerEventoPorId(db, id);
    if (!evento) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    res.json({ evento });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener evento', error: error.message });
  }
}

async function comprar(req, res) {
  try {
    const { id } = req.params;
    const { asiento } = req.body;
    const usuarioId = req.usuario.id;

    const db = await getDb();
    const evento = await obtenerEventoPorId(db, id);
    if (!evento) {
      return res.status(404).json({ mensaje: 'Evento no encontrado' });
    }
    if (evento.entradas_disponibles <= 0) {
      return res.status(409).json({ mensaje: 'No hay entradas disponibles' });
    }

    const ticketId = `TK-${Math.floor(Math.random() * 9000) + 1000}`;
    const eventId = `EV-2026-${evento.id}`;
    const codigoQr = require('../utils/qrSigner').buildQrPayload({ ticketId, eventId, seat: asiento || 'A-12' });

    const entrada = await require('../models/Entrada').crearEntrada(db, {
      evento_id: evento.id,
      usuario_id: usuarioId,
      codigo_qr: codigoQr,
      asiento: asiento || 'A-12',
      precio_pagado: evento.precio,
    });

    await actualizarEntradasDisponibles(db, evento.id, 1);
    await saveDb(db);

    res.status(201).json({ entrada });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al comprar entrada', error: error.message });
  }
}

module.exports = {
  crear,
  listar,
  obtener,
  comprar,
};
