import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { hexToBytes, utf8ToBytes } from '@noble/hashes/utils';

/**
 * QR dinámico: misma fórmula que backend/src/lib/qr.ts.
 * KM2.<entradaId>.<ventana>.<firma>, con ventana = floor(unix / 30).
 * Se genera en el móvil, así que funciona sin conexión.
 */
export const PERIODO_QR = 30;

const base64url = (bytes: Uint8Array) => {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let salida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const quedan = bytes.length - i;
    salida += alfabeto[(n >> 18) & 63]! + alfabeto[(n >> 12) & 63]!;
    if (quedan > 1) salida += alfabeto[(n >> 6) & 63]!;
    if (quedan > 2) salida += alfabeto[n & 63]!;
  }
  return salida;
};

export function tokenQr(semilla: string, entradaId: string, ahoraMs = Date.now()): string {
  const ventana = Math.floor(ahoraMs / 1000 / PERIODO_QR);
  const firma = base64url(hmac(sha256, hexToBytes(semilla), utf8ToBytes(`${entradaId}.${ventana}`))).slice(0, 22);
  return `KM2.${entradaId}.${ventana}.${firma}`;
}

/** Segundos que faltan para el siguiente cambio de código. */
export const segundosParaRotar = (ahoraMs = Date.now()) => PERIODO_QR - (Math.floor(ahoraMs / 1000) % PERIODO_QR);
