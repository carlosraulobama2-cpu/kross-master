import { almacenSeguro } from './almacen';
import type { Sesion } from './tipos';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const CLAVE = 'km.sesion';

export class ErrorApi extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

let sesion: Sesion | null = null;
let alCambiarSesion: (s: Sesion | null) => void = () => undefined;

export async function cargarSesion(): Promise<Sesion | null> {
  const crudo = await almacenSeguro.leer(CLAVE).catch(() => null);
  sesion = crudo ? (JSON.parse(crudo) as Sesion) : null;
  return sesion;
}

export async function fijarSesion(nueva: Sesion | null) {
  sesion = nueva;
  await almacenSeguro.guardar(CLAVE, nueva ? JSON.stringify(nueva) : null).catch(() => undefined);
  alCambiarSesion(nueva);
}

export const escucharSesion = (fn: (s: Sesion | null) => void) => {
  alCambiarSesion = fn;
};

export const haySesion = () => sesion !== null;

let renovando: Promise<boolean> | null = null;

/** Renueva el token una sola vez aunque fallen varias peticiones a la vez. */
function renovar(): Promise<boolean> {
  if (!sesion) return Promise.resolve(false);
  const refresh_token = sesion.refresh_token;
  renovando ??= fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  })
    .then(async (r) => {
      if (!r.ok) return false;
      await fijarSesion(((await r.json()) as { sesion: Sesion }).sesion);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      renovando = null;
    });
  return renovando;
}

type Opciones = { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; query?: Record<string, string | number | boolean | undefined | null> };

export async function api<T>(ruta: string, opciones: Opciones = {}, reintento = true): Promise<T> {
  const { method = 'GET', body, query } = opciones;
  const qs = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  // Si el token caduca en menos de un minuto, se renueva antes de llamar.
  if (sesion?.expires_at && sesion.expires_at * 1000 - Date.now() < 60_000 && !ruta.startsWith('/auth/')) {
    await renovar();
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}/api${ruta}${qs ? `?${qs}` : ''}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(sesion ? { Authorization: `Bearer ${sesion.access_token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ErrorApi(0, 'SIN_CONEXION', 'Sin conexión. Revisa tu internet e inténtalo de nuevo');
  }

  if (respuesta.status === 401 && reintento && sesion && !ruta.startsWith('/auth/')) {
    if (await renovar()) return api<T>(ruta, opciones, false);
    await fijarSesion(null);
  }

  if (respuesta.status === 204) return undefined as T;
  const datos = (await respuesta.json().catch(() => ({}))) as { error?: { codigo: string; mensaje: string } };
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, datos.error?.codigo ?? 'ERROR', datos.error?.mensaje ?? 'Algo ha fallado. Inténtalo de nuevo');
  }
  return datos as T;
}

export const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : 'Algo ha fallado. Inténtalo de nuevo');
