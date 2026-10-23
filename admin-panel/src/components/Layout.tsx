import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../lib/auth';
import { IconoAjustes, IconoAuditoria, IconoEventos, IconoMenu, IconoPedidos, IconoReembolso, IconoResumen, IconoSalir, IconoUsuarios } from './iconos';
import { Boton } from './ui';

const SECCIONES = [
  { a: '/', etiqueta: 'Resumen', icono: IconoResumen },
  { a: '/eventos', etiqueta: 'Eventos', icono: IconoEventos },
  { a: '/pedidos', etiqueta: 'Pedidos', icono: IconoPedidos },
  { a: '/reclamaciones', etiqueta: 'Reclamaciones', icono: IconoReembolso },
  { a: '/usuarios', etiqueta: 'Usuarios', icono: IconoUsuarios },
  { a: '/auditoria', etiqueta: 'Auditoría', icono: IconoAuditoria },
  { a: '/ajustes', etiqueta: 'Ajustes', icono: IconoAjustes },
];

export function Marca() {
  return (
    <div className="marca">
      <span className="marca-logo">K</span>
      <span>
        Kroos Master
        <small>Administración</small>
      </span>
    </div>
  );
}

export function Layout() {
  const { usuario, salir } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenuAbierto(false), [pathname]);

  const iniciales = (usuario?.nombre || usuario?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="shell">
      <aside className={`sidebar ${menuAbierto ? 'abierta' : ''}`}>
        <Marca />
        <nav className="nav" aria-label="Secciones">
          {SECCIONES.map(({ a, etiqueta, icono: Icono }) => (
            <NavLink key={a} to={a} end={a === '/'}>
              <Icono />
              {etiqueta}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-pie">
          <span className="avatar">{iniciales}</span>
          <div className="quien">
            <strong>{usuario?.nombre || 'Admin'}</strong>
            <span>{usuario?.email}</span>
          </div>
          <Boton variante="fantasma" className="icono" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
            <IconoSalir />
          </Boton>
        </div>
      </aside>
      {menuAbierto && <div className="velo" onClick={() => setMenuAbierto(false)} />}
      <div>
        <header className="barra-movil">
          <Boton variante="fantasma" className="icono" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú">
            <IconoMenu />
          </Boton>
          <Marca />
        </header>
        <main className="contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function Cabecera({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children?: React.ReactNode }) {
  useEffect(() => {
    document.title = `${titulo} · Kroos Master Admin`;
  }, [titulo]);
  return (
    <div className="cabecera">
      <div>
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {children}
    </div>
  );
}
