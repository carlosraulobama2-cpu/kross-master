import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

// Enlaces firmados que caducan (p. ej. recibos que se abren en el navegador sin sesión).
const clave = createHmac('sha256', env.SUPABASE_SERVICE_ROLE_KEY).update('kroos-enlaces-firmados').digest();

export function firmarEnlace(recurso: string, minutos = 60): string {
  const exp = Math.floor(Date.now() / 1000) + minutos * 60;
  const firma = createHmac('sha256', clave).update(`${recurso}.${exp}`).digest('base64url');
  return `${exp}.${firma}`;
}

export function verificarEnlace(recurso: string, token: string): boolean {
  const [expTxt, firma] = token.split('.');
  const exp = Number(expTxt);
  if (!firma || !Number.isInteger(exp) || exp * 1000 < Date.now()) return false;
  const esperada = Buffer.from(createHmac('sha256', clave).update(`${recurso}.${exp}`).digest('base64url'));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}
