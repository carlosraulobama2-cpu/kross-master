/**
 * Variables públicas de la app. Expo solo las incrusta en el build si se leen literalmente como
 * `process.env.EXPO_PUBLIC_*` (con `(process.env as any)` llegaban vacías y la app apuntaba a localhost).
 */
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
