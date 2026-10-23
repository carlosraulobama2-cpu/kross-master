import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env, esProduccion } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, noEncontradoHandler } from './middleware/errors';
import { adminRouter } from './modules/admin';
import { authRouter } from './modules/auth';
import { entradasRouter, transferenciasRouter } from './modules/entradas';
import { eventosRouter } from './modules/eventos';
import { legalRouter } from './modules/legal';
import { meRouter } from './modules/me';
import { organizadorRouter } from './modules/organizador';
import { pedidosRouter } from './modules/pedidos';
import { publicoRouter } from './modules/publico';
import { puertaRouter } from './modules/puerta';
import { webhooksRouter } from './modules/webhooks';
import './types';

export function crearApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      // La app móvil no envía Origin; en web solo se aceptan los orígenes configurados.
      origin: (origen, cb) => cb(null, !origen || !esProduccion || env.CORS_ORIGINS.includes(origen)),
    }),
  );
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  app.get('/health', (_req, res) => {
    res.json({ estado: 'ok', servicio: 'kroos-master-api', version: '2.0.0' });
  });

  // Debe ir antes de express.json(): Stripe necesita el cuerpo sin parsear.
  app.use('/api/webhooks', webhooksRouter);

  app.use(express.json({ limit: '200kb' }));

  app.use('/api', publicoRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/eventos', eventosRouter);
  app.use('/api/pedidos', pedidosRouter);
  app.use('/api/entradas', entradasRouter);
  app.use('/api/transferencias', transferenciasRouter);
  app.use('/api/puerta', puertaRouter);
  app.use('/api/organizador', organizadorRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/legal', legalRouter);

  app.use(noEncontradoHandler);
  app.use(errorHandler);
  return app;
}
