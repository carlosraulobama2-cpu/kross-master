import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app';

const app = crearApp();

describe('API', () => {
  it('responde al health check', async () => {
    const r = await request(app).get('/health').expect(200);
    expect(r.body.estado).toBe('ok');
  });

  it('devuelve 404 con formato de error estándar', async () => {
    const r = await request(app).get('/api/no-existe').expect(404);
    expect(r.body.error.codigo).toBe('RUTA_NO_ENCONTRADA');
  });

  it.each([
    ['get', '/api/me'],
    ['get', '/api/entradas'],
    ['post', '/api/pedidos'],
    ['post', '/api/puerta/validar'],
    ['get', '/api/organizador/eventos'],
    ['get', '/api/admin/resumen'],
  ] as const)('%s %s exige sesión', async (metodo, ruta) => {
    const r = await request(app)[metodo](ruta).expect(401);
    expect(r.body.error.codigo).toBe('SIN_SESION');
  });

  it('valida los datos antes de tocar la base de datos', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'no-es-un-email' }).expect(400);
    expect(r.body.error.codigo).toBe('DATOS_INVALIDOS');
  });

  it('rechaza JSON mal formado', async () => {
    const r = await request(app).post('/api/auth/login').set('content-type', 'application/json').send('{malo').expect(400);
    expect(r.body.error.codigo).toBe('JSON_INVALIDO');
  });

  it('rechaza webhooks sin firma válida', async () => {
    await request(app).post('/api/webhooks/stripe').set('content-type', 'application/json').send('{}').expect(400);
  });

  it('envía cabeceras de seguridad', async () => {
    const r = await request(app).get('/health');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-powered-by']).toBeUndefined();
  });
});
