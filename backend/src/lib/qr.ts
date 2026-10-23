import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * QR dinámico tipo TOTP.
 *
 * Cada entrada tiene una semilla secreta (solo la conoce su titular). La app
 * genera cada 30 s: KM2.<entradaId>.<ventana>.<firma>
 *   ventana = floor(unix / 30)
 *   firma   = base64url(HMAC-SHA256(semilla, "<entradaId>.<ventana>"))[0..22]
 *
 * Una captura de pantalla deja de valer en ~1 minuto y funciona sin conexión.
 * La misma función existe en la app (frontend/src/lib/qr.ts).
 */
export const PERIODO_QR_SEGUNDOS = 30;
/** Ventanas de tolerancia por desfase de reloj (±1 min). */
const TOLERANCIA = 2;
const PREFIJO = 'KM2';

export function ventanaActual(ahoraMs = Date.now()): number {
  return Math.floor(ahoraMs / 1000 / PERIODO_QR_SEGUNDOS);
}

export function firmar(semilla: string, entradaId: string, ventana: number): string {
  return createHmac('sha256', Buffer.from(semilla, 'hex'))
    .update(`${entradaId}.${ventana}`)
    .digest('base64url')
    .slice(0, 22);
}

export function generarToken(semilla: string, entradaId: string, ahoraMs = Date.now()): string {
  const ventana = ventanaActual(ahoraMs);
  return `${PREFIJO}.${entradaId}.${ventana}.${firmar(semilla, entradaId, ventana)}`;
}

export interface TokenQr {
  entradaId: string;
  ventana: number;
  firma: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parsearToken(token: string): TokenQr | null {
  const partes = token.trim().split('.');
  if (partes.length !== 4 || partes[0] !== PREFIJO) return null;
  const [, entradaId, ventanaTxt, firma] = partes as [string, string, string, string];
  const ventana = Number(ventanaTxt);
  if (!UUID.test(entradaId) || !Number.isInteger(ventana) || firma.length !== 22) return null;
  return { entradaId, ventana, firma };
}

export type ResultadoFirma = 'ok' | 'caducada' | 'invalida';

export function verificarFirma(token: TokenQr, semilla: string, ahoraMs = Date.now()): ResultadoFirma {
  const esperada = Buffer.from(firmar(semilla, token.entradaId, token.ventana));
  const recibida = Buffer.from(token.firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return 'invalida';
  return Math.abs(ventanaActual(ahoraMs) - token.ventana) <= TOLERANCIA ? 'ok' : 'caducada';
}
