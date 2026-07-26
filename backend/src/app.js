require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb, saveDb, closeDb } = require('./config/database');

const authRoutes = require('./routes/auth');
const eventoRoutes = require('./routes/eventos');
const entradaRoutes = require('./routes/entradas');
const qrRoutes = require('./routes/qr');
const stripeRoutes = require('./routes/stripe');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'kroos-master-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/entradas', entradaRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/stripe', stripeRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    const db = await getDb();
    console.log('Base de datos lista');
    
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });

    process.on('SIGINT', async () => {
      await saveDb(db);
      closeDb();
      process.exit(0);
    });
  } catch (error) {
    console.error('Error al iniciar servidor:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
