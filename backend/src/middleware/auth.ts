import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

interface RequestWithUser extends Request {
  usuario?: {
    id: string;
    email: string;
    rol: string;
  };
}

async function authMiddleware(req: RequestWithUser, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    _res.status(401).json({ mensaje: 'Token no proporcionado' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      _res.status(401).json({ mensaje: 'Token inválido o expirado' });
      return;
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol')
      .eq('id', data.user.id)
      .single();

    if (!usuario) {
      _res.status(401).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    _res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

function adminOnly(req: RequestWithUser, res: Response, next: NextFunction) {
  if (req.usuario?.rol !== 'admin') {
    res.status(403).json({ mensaje: 'Acceso denegado. Se requiere rol admin.' });
    return;
  }
  next();
}

export { authMiddleware, adminOnly };
