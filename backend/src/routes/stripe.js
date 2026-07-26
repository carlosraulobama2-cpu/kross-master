const express = require('express');
const { body } = require('express-validator');
const { stripe } = require('../config/stripe');
const { getDb } = require('../config/database');

const router = express.Router();

router.post('/crear-intento-pago', [
  body('monto').isFloat({ min: 0.01 }).withMessage('Monto inválido'),
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
  body('usuarioId').notEmpty().withMessage('usuarioId requerido'),
], async (req, res) => {
  try {
    const { monto, eventoId, usuarioId } = req.body;

    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM eventos WHERE id = ?');
    stmt.bind([eventoId]);
    const evento = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();

    if (!evento) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    if (evento.entradas_disponibles <= 0) {
      return res.status(409).json({ error: 'No hay entradas disponibles' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(monto) * 100),
      currency: 'eur',
      metadata: { eventoId, usuarioId },
      automatic_payment_methods: { enabled: true },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creando intento de pago:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
