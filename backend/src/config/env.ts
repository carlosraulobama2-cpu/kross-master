import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

/** Reads a variable; in production a missing one stops the server at startup instead of failing on the first request. */
function required(name: string, devFallback?: string): string {
  const value = process.env[name];
  if (value) return value;
  if (!isProduction && devFallback !== undefined) return devFallback;
  if (isProduction) throw new Error(`Falta la variable de entorno obligatoria ${name}`);
  return '';
}

export const env = {
  isProduction,
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT || 3000),
  supabaseUrl: required('SUPABASE_URL', ''),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY', ''),
  stripeSecretKey: required('STRIPE_SECRET_KEY', ''),
  stripeWebhookSecret: required('STRIPE_WEBHOOK_SECRET', ''),
  // Firma de los QR de las entradas. Sin valor por defecto en producción: un secreto conocido permitiría falsificar entradas.
  qrSigningSecret: required('QR_SIGNING_SECRET', 'solo-para-desarrollo-no-usar-en-produccion'),
  // Orígenes permitidos (separados por comas). Vacío = cualquiera, solo aceptable fuera de producción.
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
  currency: (process.env.PAYMENT_CURRENCY || 'eur').toLowerCase(),
};

if (isProduction && env.corsOrigins.length === 0) {
  throw new Error('Falta CORS_ORIGINS: en producción hay que indicar qué orígenes pueden llamar a la API');
}
