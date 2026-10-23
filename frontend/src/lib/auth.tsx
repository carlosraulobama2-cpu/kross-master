import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, cargarSesion, escucharSesion, fijarSesion } from './api';
import type { Sesion, Usuario } from './tipos';

interface Auth {
  usuario: Usuario | null;
  listo: boolean;
  entrar: (email: string, password: string) => Promise<void>;
  registrarse: (datos: { email: string; password: string; nombre: string }) => Promise<{ requiereConfirmacion: boolean }>;
  salir: () => Promise<void>;
  refrescar: () => Promise<void>;
  setUsuario: (u: Usuario) => void;
}

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  const refrescar = useCallback(async () => {
    const r = await api<{ usuario: Usuario }>('/me');
    setUsuario(r.usuario);
  }, []);

  useEffect(() => {
    escucharSesion((s) => {
      if (!s) {
        setUsuario(null);
        qc.removeQueries({ predicate: (q) => q.queryKey[0] === 'yo' });
      }
    });
    cargarSesion()
      .then((s) => (s ? refrescar() : undefined))
      .catch(() => fijarSesion(null))
      .finally(() => setListo(true));
  }, [refrescar, qc]);

  const entrar = useCallback(async (email: string, password: string) => {
    const r = await api<{ sesion: Sesion }>('/auth/login', { method: 'POST', body: { email, password } });
    await fijarSesion(r.sesion);
    await refrescar();
  }, [refrescar]);

  const registrarse = useCallback(async (datos: { email: string; password: string; nombre: string }) => {
    const r = await api<{ sesion: Sesion | null; requiereConfirmacion: boolean }>('/auth/registro', { method: 'POST', body: datos });
    if (r.sesion) {
      await fijarSesion(r.sesion);
      await refrescar();
    }
    return { requiereConfirmacion: r.requiereConfirmacion };
  }, [refrescar]);

  const salir = useCallback(async () => {
    await api('/me/push-token', { method: 'PUT', body: { token: null } }).catch(() => undefined);
    await fijarSesion(null);
    qc.clear();
  }, [qc]);

  const valor = useMemo(
    () => ({ usuario, listo, entrar, registrarse, salir, refrescar, setUsuario }),
    [usuario, listo, entrar, registrarse, salir, refrescar],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
