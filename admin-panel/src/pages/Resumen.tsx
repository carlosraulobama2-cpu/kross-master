import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { GraficaArea } from '../components/Grafica';
import { Cabecera } from '../components/Layout';
import { IconoDinero, IconoEntrada, IconoEventos, IconoUsuarios } from '../components/iconos';
import { ErrorCarga, Esqueleto, Segmentos, Vacio } from '../components/ui';
import { api } from '../lib/api';
import { dinero, dineroCompacto, entero } from '../lib/formato';
import type { Resumen as TResumen } from '../lib/tipos';

function Kpi({ etiqueta, valor, nota, icono, acento }: { etiqueta: string; valor: ReactNode; nota?: string; icono: ReactNode; acento?: boolean }) {
  return (
    <div className="tarjeta kpi">
      <div className="kpi-etiqueta">
        <span className={`kpi-icono ${acento ? 'acento' : ''}`}>{icono}</span>
        {etiqueta}
      </div>
      <div className="kpi-valor">{valor}</div>
      {nota && <div className="kpi-nota">{nota}</div>}
    </div>
  );
}

const etiquetaDia = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export function Resumen() {
  const [dias, setDias] = useState<'7' | '30' | '90'>('30');
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['resumen', dias],
    queryFn: () => api<{ resumen: TResumen }>('/admin/resumen', { query: { dias } }).then((r) => r.resumen),
  });

  const totalPeriodo = data?.serie.reduce((a, d) => a + d.gmv_centimos, 0) ?? 0;
  const pedidosPeriodo = data?.serie.reduce((a, d) => a + d.pedidos, 0) ?? 0;

  return (
    <>
      <Cabecera titulo="Resumen" subtitulo="Cómo va la plataforma de un vistazo">
        <Segmentos
          valor={dias}
          onCambio={setDias}
          opciones={[
            { valor: '7', etiqueta: '7 días' },
            { valor: '30', etiqueta: '30 días' },
            { valor: '90', etiqueta: '90 días' },
          ]}
        />
      </Cabecera>

      {error ? (
        <div className="tarjeta">
          <ErrorCarga error={error} reintentar={() => void refetch()} />
        </div>
      ) : (
        <>
          <div className="rejilla-kpi">
            {isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="tarjeta kpi">
                  <Esqueleto ancho="50%" />
                  <div style={{ marginTop: 16 }}>
                    <Esqueleto ancho="70%" alto={28} />
                  </div>
                </div>
              ))
            ) : (
              <>
                <Kpi acento etiqueta="Volumen vendido" valor={dineroCompacto(data.gmv_centimos)} nota={`${dinero(data.ingresos_centimos)} en gastos de gestión`} icono={<IconoDinero tam={16} />} />
                <Kpi etiqueta="Entradas vendidas" valor={entero(data.entradas_vendidas)} nota={`${entero(data.pedidos_hoy)} pedidos hoy`} icono={<IconoEntrada tam={16} />} />
                <Kpi etiqueta="Eventos a la venta" valor={entero(data.eventos_publicados)} nota={`${entero(data.organizadores)} organizadores`} icono={<IconoEventos tam={16} />} />
                <Kpi etiqueta="Usuarios" valor={entero(data.usuarios)} nota={data.reembolsado_centimos ? `${dinero(data.reembolsado_centimos)} reembolsado` : undefined} icono={<IconoUsuarios tam={16} />} />
              </>
            )}
          </div>

          <div className="dos-columnas">
            <section className="tarjeta">
              <div className="tarjeta-cab">
                <div>
                  <h2>Ventas</h2>
                  <span style={{ color: 'var(--texto-3)', fontSize: 13 }}>
                    {isPending ? '…' : `${dinero(totalPeriodo)} · ${entero(pedidosPeriodo)} pedidos`}
                  </span>
                </div>
              </div>
              <div className="tarjeta-cuerpo">
                {isPending ? (
                  <Esqueleto alto={220} />
                ) : (
                  <GraficaArea datos={data.serie.map((d) => ({ etiqueta: etiquetaDia(d.dia), valor: d.gmv_centimos }))} formato={dinero} />
                )}
              </div>
            </section>

            <section className="tarjeta">
              <div className="tarjeta-cab">
                <h2>Más vendidos</h2>
              </div>
              {isPending ? (
                <div className="tarjeta-cuerpo">
                  <Esqueleto />
                </div>
              ) : data.top_eventos.length === 0 ? (
                <Vacio icono={<IconoEventos />} titulo="Aún no hay ventas" texto="Los eventos más vendidos aparecerán aquí" />
              ) : (
                <ol className="lista-top">
                  {data.top_eventos.map((e, i) => (
                    <li key={e.id}>
                      <span className="pos">{i + 1}</span>
                      <span className="titulo">{e.titulo}</span>
                      <strong>{entero(e.vendidas)}</strong>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
