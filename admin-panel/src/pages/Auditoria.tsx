import { Cabecera } from '../components/Layout';
import { IconoAuditoria } from '../components/iconos';
import { ErrorCarga, FilasEsqueleto, Insignia, Paginacion, Vacio, type Tono } from '../components/ui';
import { fechaHora, haceCuanto } from '../lib/formato';
import { useListado } from '../lib/hooks';
import type { RegistroAuditoria } from '../lib/tipos';

const ACCIONES: Record<string, { texto: string; tono: Tono }> = {
  'evento.crear': { texto: 'Creó un evento', tono: 'neutro' },
  'evento.editar': { texto: 'Editó un evento', tono: 'neutro' },
  'evento.publicar': { texto: 'Publicó un evento', tono: 'exito' },
  'evento.cancelar': { texto: 'Canceló un evento', tono: 'peligro' },
  'pedido.reembolsar': { texto: 'Reembolsó un pedido', tono: 'info' },
  'staff.anadir': { texto: 'Añadió staff', tono: 'neutro' },
  'staff.quitar': { texto: 'Quitó staff', tono: 'neutro' },
  'usuario.hacerse_organizador': { texto: 'Pasó a organizador', tono: 'info' },
  'usuario.baja': { texto: 'Dio de baja su cuenta', tono: 'aviso' },
  'admin.usuario_actualizar': { texto: 'Cambió un usuario', tono: 'aviso' },
  'admin.evento_actualizar': { texto: 'Moderó un evento', tono: 'aviso' },
  'admin.configuracion': { texto: 'Cambió la configuración', tono: 'aviso' },
};

function detalle(datos: Record<string, unknown>): string {
  return Object.entries(datos)
    .filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
    .join(' · ');
}

export function Auditoria() {
  const l = useListado<RegistroAuditoria, Record<string, string>>('auditoria', '/admin/auditoria', 'registros', {}, 50);

  return (
    <>
      <Cabecera titulo="Auditoría" subtitulo="Registro de acciones sensibles: quién, qué y cuándo" />
      <section className="tarjeta">
        {l.error ? (
          <ErrorCarga error={l.error} reintentar={() => void l.refetch()} />
        ) : l.data && l.data.items.length === 0 ? (
          <Vacio icono={<IconoAuditoria />} titulo="Sin actividad todavía" />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Quién</th>
                  <th>Acción</th>
                  <th className="oculto-movil">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {l.isPending ? (
                  <FilasEsqueleto columnas={4} filas={10} />
                ) : (
                  l.data.items.map((r) => {
                    const a = ACCIONES[r.accion] ?? { texto: r.accion, tono: 'neutro' as Tono };
                    return (
                      <tr key={r.id}>
                        <td title={fechaHora(r.creado_en)} style={{ whiteSpace: 'nowrap', color: 'var(--texto-2)' }}>
                          {haceCuanto(r.creado_en)}
                        </td>
                        <td className="celda-principal">
                          <strong>{r.actor?.nombre || 'Sistema'}</strong>
                          <span>{r.actor?.email}</span>
                        </td>
                        <td>
                          <Insignia tono={a.tono}>{a.texto}</Insignia>
                        </td>
                        <td className="oculto-movil" style={{ color: 'var(--texto-2)', maxWidth: 420 }}>
                          {detalle(r.datos) || '—'}
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
