import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { firmarEnlace, verificarEnlace } from '../lib/firma';
import { idParam } from '../lib/schemas';
import { db, ok } from '../lib/supabase';
import { params, query } from '../middleware/validate';

/**
 * Recibo imprimible (se guarda como PDF desde el navegador). Se abre sin sesión
 * con un enlace firmado que caduca en 1 hora; la app lo pide en /api/pedidos/:id.
 */
export const recibosRouter = Router();

const BASE = env.PUBLIC_API_URL ?? '';
export const urlRecibo = (pedidoId: string) => `${BASE}/api/recibos/${pedidoId}?t=${firmarEnlace(`recibo:${pedidoId}`)}`;

const euros = (c: number) => (c / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

recibosRouter.get('/:id', async (req, res) => {
  const { id } = params(req, idParam);
  const { t } = query(req, z.object({ t: z.string().max(200) }));
  if (!verificarEnlace(`recibo:${id}`, t)) throw new AppError(403, 'ENLACE_CADUCADO', 'El enlace del recibo ha caducado. Ábrelo de nuevo desde la app');

  const p = ok(
    await db
      .from('pedidos')
      .select(
        'id, estado, subtotal_centimos, descuento_centimos, gastos_centimos, total_centimos, pagado_en, creado_en, ' +
          'usuario:usuarios!pedidos_usuario_id_fkey(nombre, email), evento:eventos(titulo, inicia_en, recinto, ciudad), ' +
          'items:pedido_items(cantidad, precio_unitario_centimos, tramo:tramos(nombre)), entradas(codigo, estado)',
      )
      .eq('id', id)
      .single(),
  ) as unknown as {
    id: string; estado: string; subtotal_centimos: number; descuento_centimos: number; gastos_centimos: number; total_centimos: number;
    pagado_en: string | null; creado_en: string; usuario: { nombre: string; email: string };
    evento: { titulo: string; inicia_en: string; recinto: string; ciudad: string };
    items: { cantidad: number; precio_unitario_centimos: number; tramo: { nombre: string } }[];
    entradas: { codigo: string; estado: string }[];
  };
  const { data: cfg } = await db.from('configuracion').select('email_soporte').eq('id', 1).single();
  const fecha = (iso: string) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' });

  const filas = p.items
    .map((i) => `<tr><td>${i.cantidad} × ${esc(i.tramo.nombre)}</td><td class="d">${euros(i.cantidad * i.precio_unitario_centimos)}</td></tr>`)
    .join('');

  res
    .type('html')
    .set('Cache-Control', 'no-store')
    // Página aislada: solo sus propios estilos y el botón de imprimir.
    .set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; script-src-attr 'unsafe-inline'; base-uri 'none'; form-action 'none'")
    .send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recibo ${esc(p.id.slice(0, 8).toUpperCase())} · Kroos Master</title>
<style>
  body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111118;background:#f5f5f8;margin:0;padding:24px}
  main{max-width:560px;margin:auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 8px 24px rgba(0,0,0,.06)}
  h1{font-size:22px;margin:0 0 4px} .sub{color:#55556a;margin:0 0 24px}
  .logo{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#00ff87;font-weight:900;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;margin:16px 0} td{padding:8px 0;border-bottom:1px solid #eee} .d{text-align:right}
  .total td{font-weight:800;font-size:18px;border-bottom:0} .muted{color:#55556a;font-size:13px}
  .estado{display:inline-block;padding:2px 10px;border-radius:99px;background:#e6fff2;color:#00894a;font-weight:700;font-size:12px}
  .reembolsado{background:#e8f4ff;color:#0a6fb0} button{margin-top:24px;padding:12px 18px;border-radius:10px;border:0;background:#111118;color:#fff;font-weight:700;cursor:pointer}
  @media print{body{background:#fff;padding:0} main{box-shadow:none} button{display:none}}
</style></head><body><main>
  <div class="logo">K</div>
  <h1>Recibo de compra</h1>
  <p class="sub">Pedido ${esc(p.id.slice(0, 8).toUpperCase())} · <span class="estado ${p.estado === 'reembolsado' ? 'reembolsado' : ''}">${p.estado === 'reembolsado' ? 'Reembolsado' : 'Pagado'}</span></p>
  <p><strong>${esc(p.evento.titulo)}</strong><br><span class="muted">${fecha(p.evento.inicia_en)} · ${esc(p.evento.recinto)}, ${esc(p.evento.ciudad)}</span></p>
  <table>
    ${filas}
    ${p.descuento_centimos ? `<tr><td>Descuento</td><td class="d">−${euros(p.descuento_centimos)}</td></tr>` : ''}
    <tr><td>Gastos de gestión</td><td class="d">${euros(p.gastos_centimos)}</td></tr>
    <tr class="total"><td>Total</td><td class="d">${euros(p.total_centimos)}</td></tr>
  </table>
  <p class="muted">Comprador: ${esc(p.usuario.nombre)} (${esc(p.usuario.email)})<br>
  Fecha de pago: ${p.pagado_en ? fecha(p.pagado_en) : '—'}<br>
  Entradas: ${p.entradas.map((e) => esc(e.codigo)).join(', ')}</p>
  <p class="muted">Kroos Master actúa como intermediario. La factura de la entrada la emite el organizador del evento si la solicitas.${cfg?.email_soporte ? ` Soporte: ${esc(cfg.email_soporte)}` : ''}</p>
  <button onclick="print()">Guardar como PDF</button>
</main></body></html>`);
});
