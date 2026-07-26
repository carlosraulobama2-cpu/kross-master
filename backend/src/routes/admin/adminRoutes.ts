import { Router, Response } from 'express';
import { supabase } from '../../config/supabase';

const router = Router();

async function requireSuperAdmin(req: any, res: Response, next: any) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ mensaje: 'Token requerido' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ mensaje: 'Token inválido' });
  }

  const role = (data.user.user_metadata?.role as string | undefined) || '';
  if (role !== 'super_admin') {
    return res.status(403).json({ mensaje: 'No autorizado' });
  }

  req.user = data.user;
  next();
}

router.get('/kpis', requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    const usuariosRes = await supabase.from('usuarios').select('id, rol, creado_en', { count: 'exact' });
    const eventosRes = await supabase.from('eventos').select('estado, precio, entradas_vendidas, creado_en', { count: 'exact' });

    const totalUsuarios = usuariosRes.count || 0;
    const totalArtistas = (usuariosRes.data || []).filter((u: any) => u.rol === 'artista').length;
    const eventosActivos = (eventosRes.data || []).filter((e: any) => e.estado === 'activo').length;
    const eventosFinalizados = (eventosRes.data || []).filter((e: any) => e.estado === 'finalizado').length;
    const eventosCancelados = (eventosRes.data || []).filter((e: any) => e.estado === 'cancelado').length;

    const gmv = (eventosRes.data || []).reduce((acc: number, e: any) => acc + (e.precio || 0) * (e.entradas_vendidas || 0), 0);

    res.json({
      kpis: [
        { id: '1', titulo: 'Volumen Total (GMV)', valor: `${gmv.toFixed(2)} €`, icono: 'cash-outline', color: '#00FF87' },
        { id: '2', titulo: 'Usuarios Totales', valor: totalUsuarios, icono: 'people-outline', color: '#5AC8FA' },
        { id: '3', titulo: 'Artistas Activos', valor: totalArtistas, icono: 'musical-notes-outline', color: '#FF2D55' },
        { id: '4', titulo: 'Eventos Activos', valor: eventosActivos, icono: 'calendar-outline', color: '#FFCC02' },
        { id: '5', titulo: 'Eventos Finalizados', valor: eventosFinalizados, icono: 'checkmark-done-outline', color: '#34C759' },
        { id: '6', titulo: 'Eventos Cancelados', valor: eventosCancelados, icono: 'close-circle-outline', color: '#FF3B30' },
      ],
    });
  } catch (e) {
    console.error('Error KPIs', e);
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/usuarios', requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('usuarios').select('*').order('creado_en', { ascending: false });
    if (error) throw error;
    res.json({ usuarios: data || [] });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.patch('/usuarios/:id/rol', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const { rol } = req.body;
    const { error } = await supabase.from('usuarios').update({ rol }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.patch('/usuarios/:id/bloquear', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const { bloqueado } = req.body;
    const { error } = await supabase.from('usuarios').update({ estado: bloqueado ? 'bloqueado' : 'activo' }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/eventos', requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('eventos').select('*').order('fecha_evento', { ascending: true });
    if (error) throw error;
    res.json({ eventos: data || [] });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.patch('/eventos/:id/estado', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const { estado } = req.body;
    const { error } = await supabase.from('eventos').update({ estado }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.patch('/eventos/:id/destacar', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const { destacado } = req.body;
    const { error } = await supabase.from('eventos').update({ destacado }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/comisiones', requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('comisiones').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ comisiones: data || [] });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.post('/comisiones', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const payload = req.body;
    const { error } = await supabase.from('comisiones').insert(payload);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/fraude/alertas', requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('alertas_fraude').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ alertas: data || [] });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/configuracion', requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('configuracion_app').select('*').single();
    if (error) throw error;
    res.json({ configuracion: data });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.patch('/configuracion', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const payload = req.body;
    const { error } = await supabase.from('configuracion_app').update(payload).eq('id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/ajustes', requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('configuracion_app').select('*').eq('id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa').single();
    if (error) throw error;
    res.json({ ajustes: data || {} });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.patch('/ajustes', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const payload = req.body;
    const { error } = await supabase.from('configuracion_app').update(payload).eq('id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.post('/notificaciones/push', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const { titulo, mensaje, ciudad } = req.body;
    const { error } = await supabase.from('notificaciones').insert({
      usuario_id: null,
      titulo,
      mensaje,
      tipo: 'global',
      ciudad,
    });
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/eventos/:id/aforo', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('entradas').select('estado', { count: 'exact' }).eq('evento_id', req.params.id);
    if (error) throw error;
    const usados = (data || []).filter((e: any) => e.estado === 'usado').length;
    res.json({ usados, total: data?.length || 0 });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/comisiones/organizador', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const organizadorId = req.query.organizadorId as string | undefined;
    let query = supabase.from('comisiones').select('*, organizador:usuarios!organizador_id(nombre, email)').order('created_at', { ascending: false });
    if (organizadorId) {
      query = query.eq('organizador_id', organizadorId);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ comisiones: data || [] });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.post('/comisiones/organizador', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const payload = req.body;
    const { error } = await supabase.from('comisiones').insert(payload);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/liquidaciones', requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('stripe_payouts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ liquidaciones: data || [] });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.post('/eventos/:id/reembolsos', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('entradas').select('id, precio_pagado').eq('evento_id', req.params.id).eq('estado', 'comprado');
    if (error) throw error;
    for (const entrada of data || []) {
      await supabase.from('entradas').update({ estado: 'reembolsado' }).eq('id', entrada.id);
    }
    res.json({ ok: true, reembolsadas: (data || []).length });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/logs', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const limite = Number(req.query.limite || 50);
    const { data, error } = await supabase.from('logs_auditoria').select('*').order('created_at', { ascending: false }).limit(limite);
    if (error) throw error;
    res.json({ logs: data || [] });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.post('/2fa/verificar', requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const { codigo } = req.body;
    const usuario = req.user;
    const { error } = await supabase.from('usuarios').update({ two_factor_secret: null }).eq('id', usuario.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ mensaje: 'Error interno' });
  }
});

router.get('/mantenimiento', requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('configuracion_app').select('modo_mantenimiento, mensaje_mantenimiento').single();
    if (error) throw error;
    res.json({ modo_mantenimiento: data?.modo_mantenimiento || false, mensaje: data?.mensaje_mantenimiento || '' });
  } catch (e) {
    res.status(500).json({ modo_mantenimiento: false, mensaje: '' });
  }
});

router.get('/app/version-minima', requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    const { data, error } = await supabase.from('configuracion_app').select('version_minima').single();
    if (error) throw error;
    res.json({ version_minima: data?.version_minima || '1.0.0' });
  } catch (e) {
    res.status(500).json({ version_minima: '1.0.0' });
  }
});

export default router;
