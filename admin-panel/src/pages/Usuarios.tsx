import { Cabecera } from '../components/Layout';
import { IconoUsuarios } from '../components/iconos';
import { Buscador, ErrorCarga, FilasEsqueleto, Insignia, Interruptor, Paginacion, Segmentos, Vacio } from '../components/ui';
import { useAuth } from '../lib/auth';
import { fecha } from '../lib/formato';
import { api, useAccion, useListado } from '../lib/hooks';
import type { Rol, Usuario } from '../lib/tipos';

export function Usuarios() {
  const { usuario: yo } = useAuth();
  const l = useListado<Usuario, { q: string; rol: '' | Rol }>('usuarios', '/admin/usuarios', 'usuarios', { q: '', rol: '' });
  const actualizar = useAccion(
    ({ id, ...cambios }: { id: string; rol?: Rol; bloqueado?: boolean }) => api(`/admin/usuarios/${id}`, { method: 'PATCH', body: cambios }),
    { exito: 'Usuario actualizado', invalidar: ['usuarios'] },
  );

  return (
    <>
      <Cabecera titulo="Usuarios" subtitulo="Roles y acceso de las cuentas" />
      <section className="tarjeta">
        <div className="filtros">
          <Buscador valor={l.filtros.q} onCambio={(v) => l.setFiltro('q', v)} placeholder="Buscar por nombre o email" />
          <Segmentos
            valor={l.filtros.rol}
            onCambio={(v) => l.setFiltro('rol', v)}
            opciones={[
              { valor: '', etiqueta: 'Todos' },
              { valor: 'fan', etiqueta: 'Fans' },
              { valor: 'organizador', etiqueta: 'Organizadores' },
              { valor: 'admin', etiqueta: 'Admins' },
            ]}
          />
        </div>
        {l.error ? (
          <ErrorCarga error={l.error} reintentar={() => void l.refetch()} />
        ) : l.data && l.data.items.length === 0 ? (
          <Vacio icono={<IconoUsuarios />} titulo="Sin resultados" texto="No hay usuarios que coincidan con la búsqueda" />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th className="oculto-movil">Alta</th>
                  <th className="oculto-movil">Cobros</th>
                  <th className="derecha">Acceso</th>
                </tr>
              </thead>
              <tbody>
                {l.isPending ? (
                  <FilasEsqueleto columnas={5} />
                ) : (
                  l.data.items.map((u) => {
                    const soyYo = u.id === yo?.id;
                    return (
                      <tr key={u.id}>
                        <td className="celda-principal">
                          <strong>
                            {u.nombre || 'Sin nombre'}
                            {u.nombre_artistico && <span> · {u.nombre_artistico}</span>}
                          </strong>
                          <span>{u.email}</span>
                        </td>
                        <td>
                          <select
                            className="selector"
                            style={{ minHeight: 32, width: 'auto' }}
                            value={u.rol}
                            disabled={soyYo}
                            aria-label={`Rol de ${u.email}`}
                            onChange={(e) => actualizar.mutate({ id: u.id, rol: e.target.value as Rol })}
                          >
                            <option value="fan">Fan</option>
                            <option value="organizador">Organizador</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="oculto-movil sin-salto">{fecha(u.creado_en)}</td>
                        <td className="oculto-movil">
                          {u.rol === 'fan' ? '—' : u.stripe_onboarding_completo ? <Insignia tono="exito">Stripe activo</Insignia> : <Insignia tono="aviso">Sin conectar</Insignia>}
                        </td>
                        <td>
                          <div className="acciones" style={{ alignItems: 'center', gap: 10 }}>
                            {u.bloqueado && <Insignia tono="peligro">Bloqueado</Insignia>}
                            <Interruptor
                              activo={!u.bloqueado}
                              deshabilitado={soyYo}
                              etiqueta={u.bloqueado ? `Desbloquear a ${u.email}` : `Bloquear a ${u.email}`}
                              onCambio={(activo) => actualizar.mutate({ id: u.id, bloqueado: !activo })}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion pagina={l.pagina} porPagina={l.porPagina} total={l.data?.total ?? 0} onCambio={l.setPagina} />
      </section>
    </>
  );
}
