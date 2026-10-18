import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { apiLimiter, authLimiter } from './middleware/rate-limit';

import adminRoutes from './modules/admin/admin.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import artistRoutes from './modules/artists/artists.routes';
import authRoutes from './modules/auth/auth.routes';
import checkinRoutes from './modules/checkin/checkin.routes';
import eventRoutes from './modules/events/events.routes';
import favoriteRoutes from './modules/favorites/favorites.routes';
import invoiceRoutes from './modules/invoices/invoices.routes';
import legalRoutes from './modules/legal/legal.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import paymentRoutes from './modules/payments/payments.routes';
import stripeWebhookRoutes from './modules/payments/stripe-webhook.routes';
import reservationRoutes from './modules/reservations/reservations.routes';
import reviewRoutes from './modules/reviews/reviews.routes';
import staffRoutes from './modules/staff/staff.routes';
import termsRoutes from './modules/terms/terms.routes';
import ticketRoutes from './modules/tickets/tickets.routes';
import tierRoutes from './modules/tiers/tiers.routes';
import transferRoutes from './modules/transfers/transfers.routes';
import userRoutes from './modules/users/users.routes';

/** Construye la app sin abrir el puerto (así las pruebas la usan directamente). Las rutas públicas no cambian. */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // El panel de administración (estático) usa scripts propios; la API solo devuelve JSON.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({ origin: env.corsOrigins.length ? env.corsOrigins : true }));

  // Antes de express.json(): Stripe firma el cuerpo en bruto.
  app.use('/api/stripe/webhook', stripeWebhookRoutes);
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'kroos-master-backend' }));

  const adminDir = path.join(__dirname, '../../admin');
  app.get('/admin', (_req, res) => res.redirect('/admin/login.html'));
  app.use('/admin', express.static(adminDir));

  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/eventos', eventRoutes);
  app.use('/api/entradas', ticketRoutes);
  app.use('/api/qr', checkinRoutes);
  app.use('/api/stripe', paymentRoutes);
  app.use('/api/usuarios', userRoutes);
  app.use('/api/favoritos', favoriteRoutes);
  app.use('/api/resenas', reviewRoutes);
  app.use('/api/notificaciones', notificationRoutes);
  app.use('/api/artistas', artistRoutes);
  app.use('/api/tramos', tierRoutes);
  app.use('/api/reservas', reservationRoutes);
  app.use('/api/transferencias', transferRoutes);
  app.use('/api/facturas', invoiceRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/terminos', termsRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/legal', legalRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
