import { NextFunction, Request, Response } from 'express';
import { supabase } from '../config/supabase';

export interface AuthUser {
  id: string;
  email: string;
  nombre?: string;
  rol: string;
}

export interface RequestWithUser extends Request {
  usuario?: AuthUser;
}

/** Valida el token de sesión de Supabase y carga el usuario con su rol. */
export async function authMiddleware(req: RequestWithUser, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ mensaje: 'Token no proporcionado' });
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(header.split(' ')[1]);
    if (error || !data.user) {
      res.status(401).json({ mensaje: 'Token inválido o expirado' });
      return;
    }
    const { data: usuario } = await supabase.from('usuarios').select('id, email, nombre, rol').eq('id', data.user.id).single();
    if (!usuario) {
      res.status(401).json({ mensaje: 'Usuario no encontrado' });
      return;
    }
    req.usuario = usuario;
    next();
  } catch {
    res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
}

/** Exige uno de los roles indicados (se usa después de authMiddleware). */
export const requireRole =
  (...roles: string[]) =>
  (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      res.status(403).json({ mensaje: `Acceso denegado. Se requiere rol ${roles.join(' o ')}.` });
      return;
    }
    next();
  };

export const adminOnly = requireRole('super_admin');
