import { useState } from 'react';
import { Cabecera } from '../components/Layout';
import { IconoAuditoria } from '../components/iconos';
import { Boton, ErrorCarga, FilasEsqueleto, Insignia, Modal, Paginacion, Segmentos, Vacio, type Tono } from '../components/ui';
import { dinero, fecha, haceCuanto } from '../lib/formato';
import { api, useAccion, useListado } from '../lib/hooks';

type Estado = 'pendiente' | 'aprobada' | 'rechazada';

interface Reclamacion {
  id: string;
  motivo: string;
  estado: Estado;
  respuesta: string | null;
  creado_en: string;
  usuario: { nombre: string; email: string } | null;
  pedido: { id: string; total_centimos: number; seguro_centimos: number; evento: { titulo: string; inicia_en: string } } | null;
}

const TONO: Record<Estado, Tono> = { pendiente: 'aviso', aprobada: 'exito', rechazada: 'peligro' };
const ETIQUETA: Record<Estado, string> = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' };

export function Reclamaciones() {
  const l = useListado<Reclamacion, { estado: '' | Estado }>('reclamaciones', '/admin/reclamaciones', 'reclamaciones', { estado: 'pendiente' });
  const [abierta, setAbierta] = useState<{ r: Reclamacion; decision: 'aprobada' | 'rechazada' } | null>(null);
  const [respuesta, setRespuesta] = useState('');

  const resolver = useAccion(
    ({ id, decision, respuesta: texto }: { id: string; decision: string; respuesta: string }) => api(`/admin/reclamaciones/${id}`, { method: 'POST', body: { decision, respuesta: texto } }),
    { exito: 'Reclamación resuelta', invalidar: ['reclamaciones', 'pedidos', 'resumen'] },
  );
  const cerrar = () => {
    setAbierta(null);
    setRespuesta('');
  };

  return (
    <>
      <Cabecera titulo="Reclamaciones" subtitulo="Protección de reembolso: compradores que no pueden ir al evento" />
      <section className="tarjeta">
        <div className="filtros">
          <Segmentos
            valor={l.filtros.estado}
            onCambio={(v) => l.setFiltro('estado', v)}
            opciones={[
              { valor: 'pendiente', etiqueta: 'Pendientes' },
              { valor: 'aprobada', etiqueta: 'Aprobadas' },
              { valor: 'rechazada', etiqueta: 'Rechazadas' },
              { valor: '', etiqueta: 'Todas' },
            ]}
          />
        </div>
        {l.error ? (
          <ErrorCarga error={l.error} reintentar={() => void l.refetch()} />
        ) : l.data && l.data.items.length === 0 ? (
          <Vacio icono={<IconoAuditoria />} titulo="No hay reclamaciones" texto="Cuando alguien reclame la protección aparecerá aquí" />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Comprador</th>
                  <th>Evento</th>
                  <th>Motivo</th>
                  <th>Estado</th>
                  <th className="derecha">A devolver</th>
                  <th className="derecha" />
                </tr>
              </thead>
              <tbody>
                {l.isPending ? (
                  <FilasEsqueleto columnas={6} />
                ) : (
                  l.data.items.map((r) => (
                    <tr key={r.id}>
                      <td className="celda-principal">
                        <strong>{r.usuario?.nombre}</strong>
                        <span>{r.usuario?.email}</span>
                      </td>
                      <td className="celda-principal">
                        <strong>{r.pedido?.evento.titulo}</strong>
                        <span>{r.pedido && fecha(r.pedido.evento.inicia_en)}</span>
                      </td>
                      <td style={{ maxWidth: 320, color: 'var(--texto-2)' }}>
                        {r.motivo}
                        <div style={{ color: 'var(--texto-3)', fontSize: 12 }}>{haceCuanto(r.creado_en)}</div>
                      </td>
                      <td>
                        <Insignia tono={TONO[r.estado]}>{ETIQUETA[r.estado]}</Insignia>
                      </td>
                      <td className="derecha">{r.pedido && dinero(r.pedido.total_centimos - r.pedido.seguro_centimos)}</td>
                      <td>
                        {r.estado === 'pendiente' && (
                          <div className="acciones">
                            <Boton pequeno onClick={() => setAbierta({ r, decision: 'rechazada' })}>
                              Rechazar
                            </Boton>
                            <Boton pequeno variante="primario" onClick={() => setAbierta({ r, decision: 'aprobada' })}>
                              Aprobar
                            </Boton>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <Paginacion pagina={l.pagina} porPagina={l.porPagina} total={l.data?.total ?? 0} onCambio={l.setPagina} />
      </section>

      <Modal
        abierto={abierta !== null}
        onCerrar={cerrar}
        pie={
          <>
            <Boton onClick={cerrar}>Volver</Boton>
            <Boton
              variante={abierta?.decision === 'aprobada' ? 'primario' : 'peligro'}
              disabled={respuesta.trim().length < 3}
              cargando={resolver.isPending}
              onClick={() => abierta && resolver.mutate({ id: abierta.r.id, decision: abierta.decision, respuesta }, { onSuccess: cerrar })}
            >
              {abierta?.decision === 'aprobada' ? `Aprobar y devolver ${abierta.r.pedido ? dinero(abierta.r.pedido.total_centimos - abierta.r.pedido.seguro_centimos) : ''}` : 'Rechazar'}
            </Boton>
          </>
        }
      >
        <h2>{abierta?.decision === 'aprobada' ? 'Aprobar reclamación' : 'Rechazar reclamación'}</h2>
        <p>
          {abierta?.decision === 'aprobada'
            ? 'Se reembolsará el pedido menos el coste de la protección y sus entradas dejarán de ser válidas.'
            : 'El comprador conservará sus entradas y recibirá tu respuesta.'}
        </p>
        <div className="campo">
          <label htmlFor="respuesta">Respuesta para el comprador</label>
          <textarea id="respuesta" className="entrada" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Ej.: hemos revisado el justificante médico" />
        </div>
      </Modal>
    </>
  );
}
