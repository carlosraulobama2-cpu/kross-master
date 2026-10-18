import rateLimit from 'express-rate-limit';

const base = { standardHeaders: true, legacyHeaders: false, message: { mensaje: 'Demasiadas peticiones. Inténtalo de nuevo en unos minutos.' } };

/** General: protege toda la API de ráfagas. */
export const apiLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 300 });
/** Login y registro: frena el adivinar contraseñas. */
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 20 });
/** Validar QR en la puerta: un escáner legítimo no necesita más. */
export const scanLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 120 });
