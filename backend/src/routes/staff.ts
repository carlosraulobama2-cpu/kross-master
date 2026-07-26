import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/generar', authMiddleware, [
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
  body('codigo').notEmpty().withMessage('codigo requerido'),
  body('tipo').optional().isIn(['staff', 'invitado']).withMessage('Tipo inválido'),
], async (req: Request, res: Response) => {
  try {
    const artistaId = (req as any).usuario.id;
    const { eventoId, codigo, tipo = 'staff', usosMaximos, expiraEn } = req.body;

    const { data: evento } = await supabase
      .from('eventos')
      .select('id')
      .eq('id', eventoId)
      .eq('artista_id', artistaId)
      .single();

    if (!evento) {
      return res.status(403).json({ mensaje: 'No autorizado para este evento' });
    }

    const { data, error } = await supabase
      .from('codigos_acceso')
      .insert([{
        evento_id: eventoId,
        codigo,
        tipo,
        usos_maximos: usosMaximos || null,
        expira_en: expiraEn || null,
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ codigoAcceso: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al generar código', error: (error as Error).message });
  }
});

router.get('/evento/:eventoId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const artistaId = (req as any).usuario.id;
    const { eventoId } = req.params;

    const { data: evento } = await supabase
      .from('eventos')
      .select('id')
      .eq('id', eventoId)
      .eq('artista_id', artistaId)
      .single();

    if (!evento) {
      return res.status(403).json({ mensaje: 'No autorizado para este evento' });
    }

    const { data, error } = await supabase
      .from('codigos_acceso')
      .select('*')
      .eq('evento_id', eventoId)
      .order('creado_en', { ascending: false });

    if (error) throw error;
    res.json({ codigos: data || [] });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar códigos', error: (error as Error).message });
  }
});

router.post('/validar', async (req: Request, res: Response) => {
  try {
    const { codigo, eventoId } = req.body;

    const { data: codigoAcceso, error } = await supabase
      .from('codigos_acceso')
      .select('*')
      .eq('codigo', codigo)
      .eq('evento_id', eventoId)
      .eq('activo', true)
      .single();

    if (error || !codigoAcceso) {
      return res.status(404).json({ mensaje: 'Código de acceso inválido' });
    }

    if (codigoAcceso.expira_en && new Date(codigoAcceso.expira_en) < new Date()) {
      return res.status(400).json({ mensaje: 'Código expirado' });
    }

    if (codigoAcceso.usos_maximos && codigoAcceso.usos_actuales >= codigoAcceso.usos_maximos) {
      return res.status(400).json({ mensaje: 'Código sin usos disponibles' });
    }

    res.json({ valido: true, codigoAcceso });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al validar código', error: (error as Error).message });
  }
});

router.post('/asignar-staff', authMiddleware, [
  body('eventoId').notEmpty().withMessage('eventoId requerido'),
  body('email').isEmail().withMessage('Email inválido'),
  body('rolStaff').optional().isIn(['validador', 'supervisor']).withMessage('Rol inválido'),
], async (req: Request, res: Response) => {
  try {
    const artistaId = (req as any).usuario.id;
    const { eventoId, email, rolStaff = 'validador' } = req.body;

    const { data: evento } = await supabase
      .from('eventos')
      .select('id')
      .eq('id', eventoId)
      .eq('artista_id', artistaId)
      .single();

    if (!evento) {
      return res.status(403).json({ mensaje: 'No autorizado para este evento' });
    }

    const { data: usuarioDestino } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (!usuarioDestino) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const { data, error } = await supabase
      .from('staff_evento')
      .upsert([{
        evento_id: eventoId,
        usuario_id: usuarioDestino.id,
        rol_staff: rolStaff,
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ staff: data });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al asignar staff', error: (error as Error).message });
  }
});

export default router;
