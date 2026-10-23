import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { Marca } from '../components/Layout';
import { IconoAlerta } from '../components/iconos';
import { Boton } from '../components/ui';
import { useAuth } from '../lib/auth';

export function Login() {
  const { usuario, entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await entrar(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <form className="tarjeta login-tarjeta" onSubmit={enviar}>
        <Marca />
        <h1>Panel de administración</h1>
        <p className="sub">Acceso solo para administradores</p>
        {error && (
          <div className="aviso-error" role="alert">
            <IconoAlerta />
            {error}
          </div>
        )}
        <div className="campo">
          <label htmlFor="email">Email</label>
          <input id="email" className="entrada" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </div>
        <div className="campo">
          <label htmlFor="password">Contraseña</label>
          <input id="password" className="entrada" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Boton type="submit" variante="primario" cargando={enviando}>
          Entrar
        </Boton>
      </form>
    </div>
  );
}
