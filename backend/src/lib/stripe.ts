import Stripe from 'stripe';
import { env } from '../config/env';

const destino = env.STRIPE_API_URL ? new URL(env.STRIPE_API_URL) : null;

export const stripe = new Stripe(
  env.STRIPE_SECRET_KEY,
  destino ? { host: destino.hostname, port: Number(destino.port) || undefined, protocol: destino.protocol.replace(':', '') as 'http' | 'https' } : undefined,
);
