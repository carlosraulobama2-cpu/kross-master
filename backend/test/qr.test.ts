import { describe, expect, it } from 'vitest';
import { PERIODO_QR_SEGUNDOS, generarToken, parsearToken, verificarFirma } from '../src/lib/qr';

const semilla = 'ab'.repeat(32);
const entradaId = '3f1c2b9e-8a7d-4c6b-9e5f-1a2b3c4d5e6f';
const ahora = Date.UTC(2026, 9, 23, 20, 0, 0);

describe('QR dinámico', () => {
  it('genera un token con el formato esperado', () => {
    expect(generarToken(semilla, entradaId, ahora)).toMatch(/^KM2\.[0-9a-f-]{36}\.\d+\.[A-Za-z0-9_-]{22}$/);
  });

  it('cambia cada periodo', () => {
    const a = generarToken(semilla, entradaId, ahora);
    const b = generarToken(semilla, entradaId, ahora + PERIODO_QR_SEGUNDOS * 1000);
    expect(a).not.toBe(b);
  });

  it('acepta el token actual y un pequeño desfase de reloj', () => {
    const token = parsearToken(generarToken(semilla, entradaId, ahora))!;
    expect(verificarFirma(token, semilla, ahora)).toBe('ok');
    expect(verificarFirma(token, semilla, ahora + 55_000)).toBe('ok');
  });

  it('rechaza capturas antiguas', () => {
    const token = parsearToken(generarToken(semilla, entradaId, ahora))!;
    expect(verificarFirma(token, semilla, ahora + 5 * 60_000)).toBe('caducada');
  });

  it('rechaza firmas de otra semilla o manipuladas', () => {
    const token = parsearToken(generarToken(semilla, entradaId, ahora))!;
    expect(verificarFirma(token, 'cd'.repeat(32), ahora)).toBe('invalida');
    expect(verificarFirma({ ...token, ventana: token.ventana + 1 }, semilla, ahora)).toBe('invalida');
  });

  it('ignora textos que no son tokens', () => {
    expect(parsearToken('hola')).toBeNull();
    expect(parsearToken('KM2.no-uuid.1.abc')).toBeNull();
    expect(parsearToken('{"ticket_id":"TK-1"}')).toBeNull();
  });
});
