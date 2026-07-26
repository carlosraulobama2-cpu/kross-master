require('dotenv').config();
import express from 'express';
import cors from 'cors';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import authRoutes from './routes/auth';
import eventoRoutes from './routes/eventos';
import entradaRoutes from './routes/entradas';
import qrRoutes from './routes/qr';
import stripeRoutes from './routes/stripe';
import stripeWebhookRoutes from './routes/stripeWebhook';
import usuarioRoutes from './routes/usuarios';
import favoritoRoutes from './routes/favoritos';
import resenaRoutes from './routes/resenas';
import notificacionRoutes from './routes/notificaciones';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kroos-master-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/entradas', entradaRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/stripe/webhook', stripeWebhookRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/favoritos', favoritoRoutes);
app.use('/api/resenas', resenaRoutes);
app.use('/api/notificaciones', notificacionRoutes);

app.use((_req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

export { app, server };
