import Stripe from 'stripe';
import { env } from './env';

if (!env.stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY no está configurado en el backend');
}

export const stripe = new Stripe(env.stripeSecretKey || 'sk_test_sin_configurar', { apiVersion: '2025-02-24.acacia' });
