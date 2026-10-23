import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ErrorApi, guardarSesion, leerSesion, onSesionCaducada } from './api';
import type { Sesion, UsuarioSesion } from './tipos';

interface Auth {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  entrar: (email: string, password: string) => Promise<void>;
  salir: () => void;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);

  const salir = useCallback(() => {
    guardarSesion(null);
    setUsuario(null);
  }, []);

  useEffect(() => {
    onSesionCaducada(salir);
    if (!leerSesion()) {
      setCargando(false);
      return;
    }
    api<{ usuario: UsuarioSesion }>('/me')
      .then(({ usuario: u }) => (u.rol === 'admin' ? setUsuario(u) : salir()))
      .catch(salir)
      .finally(() => setCargando(false));
  }, [salir]);

  const entrar = useCallback(async (email: string, password: string) => {
    const r = await api<{ sesion: Sesion; usuario: UsuarioSesion }>('/auth/login', { method: 'POST', body: { email, password } });
    if (r.usuario.rol !== 'admin') {
      throw new ErrorApi(403, 'NO_ADMIN', 'Esta cuenta no tiene permisos de administración');
    }
    guardarSesion(r.sesion);
    setUsuario(r.usuario);
  }, []);

  const valor = useMemo(() => ({ usuario, cargando, entrar, salir }), [usuario, cargando, entrar, salir]);
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
