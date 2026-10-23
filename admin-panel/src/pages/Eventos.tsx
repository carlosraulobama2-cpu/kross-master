import { useState } from 'react';
import { Cabecera } from '../components/Layout';
import { IconoEstrella, IconoEventos } from '../components/iconos';
import { Boton, Buscador, ErrorCarga, FilasEsqueleto, Insignia, Modal, Paginacion, Progreso, Segmentos, Vacio, type Tono } from '../components/ui';
import { ETIQUETA_EVENTO, fecha } from '../lib/formato';
import { api, useAccion, useListado } from '../lib/hooks';
import type { EstadoEvento, EventoAdmin } from '../lib/tipos';

const TONO: Record<EstadoEvento, Tono> = { publicado: 'exito', borrador: 'neutro', cancelado: 'peligro', finalizado: 'info' };

export function Eventos() {
  const l = useListado<EventoAdmin, { q: string; estado: '' | EstadoEvento }>('eventos', '/admin/eventos', 'eventos', { q: '', estado: '' });
  const [aCancelar, setACancelar] = useState<EventoAdmin | null>(null);
  const [motivo, setMotivo] = useState('');

  const actualizar = useAccion(
    ({ id, ...cambios }: { id: string; destacado?: boolean; estado?: EstadoEvento }) => api(`/admin/eventos/${id}`, { method: 'PATCH', body: cambios }),
    { exito: 'Evento actualizado', invalidar: ['eventos', 'resumen'] },
  );
  const cancelar = useAccion(
    ({ id, motivo: m }: { id: string; motivo: string }) => api<{ reembolsados: number }>(`/admin/eventos/${id}/cancelar`, { method: 'POST', body: { motivo: m } }),
    { exito: 'Evento cancelado y pedidos reembolsados', invalidar: ['eventos', 'pedidos', 'resumen'] },
  );

  return (
    <>
      <Cabecera titulo="Eventos" subtitulo="Modera, destaca o cancela eventos de toda la plataforma" />
      <section className="tarjeta">
        <div className="filtros">
          <Buscador valor={l.filtros.q} onCambio={(v) => l.setFiltro('q', v)} placeholder="Buscar por título" />
          <Segmentos
            valor={l.filtros.estado}
            onCambio={(v) => l.setFiltro('estado', v)}
            opciones={[
              { valor: '', etiqueta: 'Todos' },
              { valor: 'publicado', etiqueta: 'Publicados' },
              { valor: 'borrador', etiqueta: 'Borradores' },
              { valor: 'finalizado', etiqueta: 'Finalizados' },
              { valor: 'cancelado', etiqueta: 'Cancelados' },
            ]}
          />
        </div>
        {l.error ? (
          <ErrorCarga error={l.error} reintentar={() => void l.refetch()} />
        ) : l.data && l.data.items.length === 0 ? (
          <Vacio icono={<IconoEventos />} titulo="No hay eventos" texto="Prueba con otros filtros" />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th className="oculto-movil">Organizador</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Vendidas</th>
                  <th className="derecha">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {l.isPending ? (
                  <FilasEsqueleto columnas={6} />
                ) : (
                  l.data.items.map((e) => (
                    <tr key={e.id}>
                      <td className="celda-principal">
                        <strong>{e.titulo}</strong>
                        <span>
                          {e.recinto} · {e.ciudad}
                        </span>
                      </td>
                      <td className="oculto-movil celda-principal">
                        <strong>{e.organizador?.nombre_artistico || e.organizador?.nombre}</strong>
                        <span>{e.organizador?.email}</span>
                      </td>
                      <td className="sin-salto">{fecha(e.inicia_en)}</td>
                      <td>
                        <Insignia tono={TONO[e.estado]}>{ETIQUETA_EVENTO[e.estado]}</Insignia>
                      </td>
                      <td>
                        <Progreso valor={e.vendidas} total={e.aforo} />
                      </td>
                      <td>
                        <div className="acciones">
                          <Boton
                            pequeno
                            variante="fantasma"
                            disabled={e.estado === 'cancelado'}
                            onClick={() => actualizar.mutate({ id: e.id, destacado: !e.destacado })}
                            aria-label={e.destacado ? 'Quitar de destacados' : 'Destacar'}
                            title={e.destacado ? 'Quitar de destacados' : 'Destacar en portada'}
                            style={{ color: e.destacado ? 'var(--aviso)' : undefined }}
                          >
                            <IconoEstrella tam={16} relleno={e.destacado} />
                          </Boton>
                          {e.estado === 'publicado' && (
                            <Boton pequeno onClick={() => actualizar.mutate({ id: e.id, estado: 'borrador' })}>
                              Ocultar
                            </Boton>
                          )}
                          {e.estado === 'borrador' && (
                            <Boton pequeno onClick={() => actualizar.mutate({ id: e.id, estado: 'publicado' })}>
                              Publicar
                            </Boton>
                          )}
                          {(e.estado === 'publicado' || e.estado === 'borrador') && (
                            <Boton pequeno variante="fantasma" style={{ color: 'var(--peligro)' }} onClick={() => setACancelar(e)}>
                              Cancelar
                            </Boton>
                          )}
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
        abierto={aCancelar !== null}
        onCerrar={() => {
          setACancelar(null);
          setMotivo('');
        }}
        pie={
          <>
            <Boton onClick={() => setACancelar(null)}>Volver</Boton>
            <Boton
              variante="peligro"
              disabled={motivo.trim().length < 5}
              cargando={cancelar.isPending}
              onClick={() =>
                aCancelar &&
                cancelar.mutate({ id: aCancelar.id, motivo }, { onSuccess: () => { setACancelar(null); setMotivo(''); } })
              }
            >
              Cancelar y reembolsar
            </Boton>
          </>
        }
      >
        <h2>Cancelar «{aCancelar?.titulo}»</h2>
        <p>
          Se reembolsará a todos los compradores ({aCancelar?.vendidas ?? 0} entradas) y se les avisará con el motivo. Esta acción no se puede deshacer.
        </p>
        <div className="campo">
          <label htmlFor="motivo">Motivo para los asistentes</label>
          <textarea id="motivo" className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: el artista ha cancelado su gira" />
        </div>
      </Modal>
    </>
  );
}
