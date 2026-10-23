import { useState } from 'react';
import { Cabecera } from '../components/Layout';
import { IconoAyuda } from '../components/iconos';
import { Boton, ErrorCarga, FilasEsqueleto, Insignia, Modal, Paginacion, Segmentos, Vacio, type Tono } from '../components/ui';
import { dinero, haceCuanto } from '../lib/formato';
import { api, useAccion, useListado } from '../lib/hooks';

type Estado = 'abierta' | 'respondida' | 'cerrada';

interface Consulta {
  id: string;
  email: string;
  asunto: string;
  mensaje: string;
  estado: Estado;
  respuesta: string | null;
  creado_en: string;
  usuario: { id: string; nombre: string } | null;
  pedido: { id: string; total_centimos: number; estado: string; evento: { titulo: string } } | null;
}

const TONO: Record<Estado, Tono> = { abierta: 'aviso', respondida: 'exito', cerrada: 'neutro' };
const ETIQUETA: Record<Estado, string> = { abierta: 'Abierta', respondida: 'Respondida', cerrada: 'Cerrada' };

export function Soporte() {
  const l = useListado<Consulta, { estado: '' | Estado }>('soporte', '/admin/soporte', 'consultas', { estado: 'abierta' });
  const [abierta, setAbierta] = useState<Consulta | null>(null);
  const [respuesta, setRespuesta] = useState('');

  const responder = useAccion(
    ({ id, respuesta: texto, cerrar }: { id: string; respuesta?: string; cerrar: boolean }) => api(`/admin/soporte/${id}`, { method: 'POST', body: { respuesta: texto, cerrar } }),
    { exito: 'Consulta actualizada', invalidar: ['soporte'] },
  );
  const cerrarModal = () => {
    setAbierta(null);
    setRespuesta('');
  };

  return (
    <>
      <Cabecera titulo="Soporte" subtitulo="Mensajes que llegan desde el centro de ayuda de la app" />
      <section className="tarjeta">
        <div className="filtros">
          <Segmentos
            valor={l.filtros.estado}
            onCambio={(v) => l.setFiltro('estado', v)}
            opciones={[
              { valor: 'abierta', etiqueta: 'Abiertas' },
              { valor: 'respondida', etiqueta: 'Respondidas' },
              { valor: 'cerrada', etiqueta: 'Cerradas' },
              { valor: '', etiqueta: 'Todas' },
            ]}
          />
        </div>
        {l.error ? (
          <ErrorCarga error={l.error} reintentar={() => void l.refetch()} />
        ) : l.data && l.data.items.length === 0 ? (
          <Vacio icono={<IconoAyuda />} titulo="Bandeja vacía" texto="No hay consultas en este estado" />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>De</th>
                  <th>Consulta</th>
                  <th>Pedido</th>
                  <th>Estado</th>
                  <th className="derecha" />
                </tr>
              </thead>
              <tbody>
                {l.isPending ? (
                  <FilasEsqueleto columnas={5} />
                ) : (
                  l.data.items.map((c) => (
                    <tr key={c.id}>
                      <td className="celda-principal">
                        <strong>{c.usuario?.nombre ?? 'Sin cuenta'}</strong>
                        <span>{c.email}</span>
                      </td>
                      <td style={{ maxWidth: 380 }}>
                        <strong>{c.asunto}</strong>
                        <div style={{ color: 'var(--texto-2)' }}>{c.mensaje}</div>
                        <div style={{ color: 'var(--texto-3)', fontSize: 12 }}>{haceCuanto(c.creado_en)}</div>
                      </td>
                      <td className="celda-principal">
                        {c.pedido ? (
                          <>
                            <strong>{c.pedido.evento.titulo}</strong>
                            <span>
                              {dinero(c.pedido.total_centimos)} · {c.pedido.estado}
                            </span>
                          </>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td>
                        <Insignia tono={TONO[c.estado]}>{ETIQUETA[c.estado]}</Insignia>
                      </td>
                      <td>
                        <div className="acciones">
                          {c.estado !== 'cerrada' && (
                            <Boton pequeno onClick={() => responder.mutate({ id: c.id, cerrar: true })}>
                              Cerrar
                            </Boton>
                          )}
                          <Boton
                            pequeno
                            variante="primario"
                            onClick={() => {
                              setAbierta(c);
                              setRespuesta(c.respuesta ?? '');
                            }}
                          >
                            {c.respuesta ? 'Ver / editar' : 'Responder'}
                          </Boton>
                        </div>
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
        onCerrar={cerrarModal}
        pie={
          <>
            <Boton onClick={cerrarModal}>Volver</Boton>
            <Boton
              variante="primario"
              disabled={respuesta.trim().length < 5}
              cargando={responder.isPending}
              onClick={() => abierta && responder.mutate({ id: abierta.id, respuesta: respuesta.trim(), cerrar: false }, { onSuccess: cerrarModal })}
            >
              Enviar respuesta
            </Boton>
          </>
        }
      >
        <h2>{abierta?.asunto}</h2>
        <p>{abierta?.mensaje}</p>
        <div className="campo">
          <label htmlFor="respuesta">Respuesta</label>
          <textarea id="respuesta" className="entrada" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder="Si tiene cuenta, la recibe como notificación en la app" />
        </div>
        {!abierta?.usuario && <p style={{ color: 'var(--texto-3)', fontSize: 13 }}>Esta persona no tiene cuenta: respóndele también por email a {abierta?.email}.</p>}
      </Modal>
    </>
  );
}
