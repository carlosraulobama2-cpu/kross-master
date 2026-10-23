import { useState } from 'react';
import { Cabecera } from '../components/Layout';
import { IconoPedidos, IconoReembolso } from '../components/iconos';
import { Boton, ErrorCarga, FilasEsqueleto, Insignia, Modal, Paginacion, Segmentos, Vacio, type Tono } from '../components/ui';
import { dinero, ETIQUETA_PEDIDO, fechaHora } from '../lib/formato';
import { api, useAccion, useListado } from '../lib/hooks';
import type { EstadoPedido, PedidoAdmin } from '../lib/tipos';

const TONO: Record<EstadoPedido, Tono> = { pagado: 'exito', pendiente: 'aviso', expirado: 'neutro', cancelado: 'neutro', reembolsado: 'info' };

export function Pedidos() {
  const l = useListado<PedidoAdmin, { estado: '' | EstadoPedido }>('pedidos', '/admin/pedidos', 'pedidos', { estado: 'pagado' });
  const [aReembolsar, setAReembolsar] = useState<PedidoAdmin | null>(null);
  const [motivo, setMotivo] = useState('');

  const reembolsar = useAccion(
    ({ id, motivo: m }: { id: string; motivo: string }) => api(`/admin/pedidos/${id}/reembolsar`, { method: 'POST', body: { motivo: m } }),
    { exito: 'Reembolso realizado', invalidar: ['pedidos', 'resumen'] },
  );
  const cerrar = () => {
    setAReembolsar(null);
    setMotivo('');
  };

  return (
    <>
      <Cabecera titulo="Pedidos" subtitulo="Compras de toda la plataforma y reembolsos" />
      <section className="tarjeta">
        <div className="filtros">
          <Segmentos
            valor={l.filtros.estado}
            onCambio={(v) => l.setFiltro('estado', v)}
            opciones={[
              { valor: 'pagado', etiqueta: 'Pagados' },
              { valor: 'pendiente', etiqueta: 'Pendientes' },
              { valor: 'reembolsado', etiqueta: 'Reembolsados' },
              { valor: 'expirado', etiqueta: 'Expirados' },
              { valor: '', etiqueta: 'Todos' },
            ]}
          />
        </div>
        {l.error ? (
          <ErrorCarga error={l.error} reintentar={() => void l.refetch()} />
        ) : l.data && l.data.items.length === 0 ? (
          <Vacio icono={<IconoPedidos />} titulo="No hay pedidos" texto="Cuando alguien compre entradas aparecerá aquí" />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Comprador</th>
                  <th>Evento</th>
                  <th className="oculto-movil">Fecha</th>
                  <th>Estado</th>
                  <th className="derecha">Total</th>
                  <th className="derecha" />
                </tr>
              </thead>
              <tbody>
                {l.isPending ? (
                  <FilasEsqueleto columnas={6} />
                ) : (
                  l.data.items.map((p) => {
                    const entradas = p.items.reduce((a, i) => a + i.cantidad, 0);
                    return (
                      <tr key={p.id}>
                        <td className="celda-principal">
                          <strong>{p.usuario?.nombre || '—'}</strong>
                          <span>{p.usuario?.email}</span>
                        </td>
                        <td className="celda-principal">
                          <strong>{p.evento?.titulo}</strong>
                          <span>
                            {entradas} entrada{entradas === 1 ? '' : 's'} · #{p.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="oculto-movil sin-salto">{fechaHora(p.pagado_en ?? p.creado_en)}</td>
                        <td>
                          <Insignia tono={TONO[p.estado]}>{ETIQUETA_PEDIDO[p.estado]}</Insignia>
                        </td>
                        <td className="derecha celda-principal">
                          <strong>{dinero(p.total_centimos)}</strong>
                          <span>{dinero(p.gastos_centimos)} gastos</span>
                        </td>
                        <td>
                          <div className="acciones">
                            {p.estado === 'pagado' && (
                              <Boton pequeno onClick={() => setAReembolsar(p)}>
                                <IconoReembolso tam={14} />
                                Reembolsar
                              </Boton>
                            )}
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

      <Modal
        abierto={aReembolsar !== null}
        onCerrar={cerrar}
        pie={
          <>
            <Boton onClick={cerrar}>Volver</Boton>
            <Boton
              variante="peligro"
              disabled={motivo.trim().length < 3}
              cargando={reembolsar.isPending}
              onClick={() => aReembolsar && reembolsar.mutate({ id: aReembolsar.id, motivo }, { onSuccess: cerrar })}
            >
              Reembolsar {aReembolsar && dinero(aReembolsar.total_centimos)}
            </Boton>
          </>
        }
      >
        <h2>Reembolsar pedido</h2>
        <p>
          Se devolverá el importe íntegro a {aReembolsar?.usuario?.email} y sus entradas para «{aReembolsar?.evento?.titulo}» dejarán de ser válidas.
        </p>
        <div className="campo">
          <label htmlFor="motivo-r">Motivo</label>
          <input id="motivo-r" className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: compra duplicada" />
          <span className="ayuda">El comprador lo verá en la notificación.</span>
        </div>
      </Modal>
    </>
  );
}
