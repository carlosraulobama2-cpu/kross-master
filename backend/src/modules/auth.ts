import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AppError } from '../lib/errors';
import { authPublica, db } from '../lib/supabase';
import { body } from '../middleware/validate';

export const authRouter = Router();

// Frena fuerza bruta: 10 intentos cada 15 min por IP.
authRouter.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }));

const email = z.string().trim().toLowerCase().email('Email no válido');

const registroSchema = z.object({
  email,
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
  nombre: z.string().trim().min(2, 'Escribe tu nombre').max(80),
});

authRouter.post('/registro', async (req, res) => {
  const datos = body(req, registroSchema);

  const { data: cfg } = await db.from('configuracion').select('registro_abierto').eq('id', 1).single();
  if (cfg && !cfg.registro_abierto) throw new AppError(403, 'REGISTRO_CERRADO', 'El registro está cerrado temporalmente');

  const { data, error } = await authPublica.auth.signUp({
    email: datos.email,
    password: datos.password,
    options: { data: { nombre: datos.nombre } },
  });
  if (error) throw new AppError(400, 'REGISTRO_FALLIDO', traducirErrorAuth(error.message));

  res.status(201).json({ sesion: data.session ? sesionPublica(data.session) : null, requiereConfirmacion: !data.session });
});

authRouter.post('/login', async (req, res) => {
  const datos = body(req, z.object({ email, password: z.string().min(1, 'Escribe tu contraseña') }));
  const { data, error } = await authPublica.auth.signInWithPassword(datos);
  if (error || !data.session) throw new AppError(401, 'CREDENCIALES', 'Email o contraseña incorrectos');

  const { data: perfil } = await db.from('usuarios').select('id, email, nombre, rol, bloqueado').eq('id', data.user.id).single();
  if (perfil?.bloqueado) throw new AppError(403, 'CUENTA_BLOQUEADA', 'Tu cuenta está bloqueada. Contacta con soporte');

  res.json({ sesion: sesionPublica(data.session), usuario: perfil });
});

authRouter.post('/refresh', async (req, res) => {
  const { refresh_token } = body(req, z.object({ refresh_token: z.string().min(1) }));
  const { data, error } = await authPublica.auth.refreshSession({ refresh_token });
  if (error || !data.session) throw new AppError(401, 'SESION_INVALIDA', 'Tu sesión ha caducado, vuelve a entrar');
  res.json({ sesion: sesionPublica(data.session) });
});

authRouter.post('/recuperar', async (req, res) => {
  const datos = body(req, z.object({ email }));
  // Siempre 204: no revelamos si el email existe.
  await authPublica.auth.resetPasswordForEmail(datos.email);
  res.status(204).end();
});

function sesionPublica(s: { access_token: string; refresh_token: string; expires_at?: number }) {
  return { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at ?? null };
}

function traducirErrorAuth(mensaje: string): string {
  if (/already registered|already exists/i.test(mensaje)) return 'Ya existe una cuenta con ese email';
  if (/password/i.test(mensaje)) return 'La contraseña no es suficientemente segura';
  return 'No se pudo crear la cuenta';
}
