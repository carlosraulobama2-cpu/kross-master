import type { Sesion } from './tipos';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:3000';
const CLAVE_SESION = 'km_admin_sesion';

export class ErrorApi extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export function leerSesion(): Sesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE_SESION);
    return crudo ? (JSON.parse(crudo) as Sesion) : null;
  } catch {
    return null;
  }
}

export function guardarSesion(sesion: Sesion | null) {
  try {
    if (sesion) localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    else localStorage.removeItem(CLAVE_SESION);
  } catch {
    // Almacenamiento bloqueado: la sesión dura lo que la pestaña.
  }
}

let alCerrarSesion: () => void = () => undefined;
export const onSesionCaducada = (fn: () => void) => {
  alCerrarSesion = fn;
};

// Una sola renovación en vuelo aunque fallen varias peticiones a la vez.
let renovando: Promise<boolean> | null = null;

async function renovar(): Promise<boolean> {
  const sesion = leerSesion();
  if (!sesion) return false;
  renovando ??= fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: sesion.refresh_token }),
  })
    .then(async (r) => {
      if (!r.ok) return false;
      guardarSesion(((await r.json()) as { sesion: Sesion }).sesion);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      renovando = null;
    });
  return renovando;
}

type Opciones = { method?: string; body?: unknown; query?: Record<string, string | number | boolean | undefined> };

export async function api<T>(ruta: string, { method = 'GET', body, query }: Opciones = {}, reintento = true): Promise<T> {
  const url = new URL(`${API_URL}/api${ruta}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const sesion = leerSesion();
  const respuesta = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(sesion ? { Authorization: `Bearer ${sesion.access_token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new ErrorApi(0, 'SIN_CONEXION', 'No se puede conectar con el servidor');
  });

  if (respuesta.status === 401 && reintento && sesion && !ruta.startsWith('/auth/')) {
    if (await renovar()) return api<T>(ruta, { method, body, query }, false);
    guardarSesion(null);
    alCerrarSesion();
  }

  if (respuesta.status === 204) return undefined as T;
  const datos = (await respuesta.json().catch(() => ({}))) as { error?: { codigo: string; mensaje: string } };
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, datos.error?.codigo ?? 'ERROR', datos.error?.mensaje ?? 'Algo ha fallado');
  }
  return datos as T;
}
