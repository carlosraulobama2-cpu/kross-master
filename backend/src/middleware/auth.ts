import type { NextFunction, Request, Response } from 'express';
import { AppError, prohibido } from '../lib/errors';
import { db } from '../lib/supabase';
import type { Rol, UsuarioSesion } from '../types';

function extraerToken(req: Request): string | null {
  const cabecera = req.headers.authorization ?? '';
  return cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
}

async function resolverUsuario(token: string): Promise<UsuarioSesion> {
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new AppError(401, 'SESION_INVALIDA', 'Tu sesión ha caducado, vuelve a entrar');

  // El rol se lee SIEMPRE de la tabla, nunca del token ni de user_metadata.
  const { data: perfil } = await db
    .from('usuarios')
    .select('id, email, nombre, rol, bloqueado')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!perfil) throw new AppError(401, 'SESION_INVALIDA', 'Usuario no encontrado');
  if (perfil.bloqueado) throw new AppError(403, 'CUENTA_BLOQUEADA', 'Tu cuenta está bloqueada. Contacta con soporte');
  return { id: perfil.id, email: perfil.email, nombre: perfil.nombre, rol: perfil.rol as Rol };
}

/** Exige sesión válida. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extraerToken(req);
  if (!token) throw new AppError(401, 'SIN_SESION', 'Inicia sesión para continuar');
  req.usuario = await resolverUsuario(token);
  next();
}

/** Carga el usuario si hay token, pero no lo exige. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extraerToken(req);
  if (token) {
    try {
      req.usuario = await resolverUsuario(token);
    } catch {
      // Sesión caducada en una ruta pública: se trata como anónimo.
    }
  }
  next();
}

export function requireRol(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) throw prohibido();
    next();
  };
}

/** Usuario autenticado (para handlers detrás de requireAuth). */
export function usuarioDe(req: Request): UsuarioSesion {
  if (!req.usuario) throw new AppError(401, 'SIN_SESION', 'Inicia sesión para continuar');
  return req.usuario;
}
