import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) => v.split(',').map((o) => o.trim()).filter(Boolean)),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  /** Solo desarrollo: apunta a stripe-mock (p. ej. http://localhost:12111). */
  STRIPE_API_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof schema>;

function cargarEnv(): Env {
  const resultado = schema.safeParse(process.env);
  if (!resultado.success) {
    const faltan = resultado.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Variables de entorno inválidas:\n${faltan}`);
  }
  return resultado.data;
}

export const env = cargarEnv();
export const esProduccion = env.NODE_ENV === 'production';
