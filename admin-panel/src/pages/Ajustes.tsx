import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Cabecera } from '../components/Layout';
import { Boton, ErrorCarga, Esqueleto, Interruptor } from '../components/ui';
import { dinero, haceCuanto } from '../lib/formato';
import { api, useAccion } from '../lib/hooks';
import type { Configuracion } from '../lib/tipos';

// Postgres devuelve los numeric como texto: se pasan a número para el formulario.
const normalizar = (c: Configuracion): Configuracion => ({
  ...c,
  gastos_gestion_porcentaje: Number(c.gastos_gestion_porcentaje),
  comision_plataforma_porcentaje: Number(c.comision_plataforma_porcentaje),
  seguro_porcentaje: Number(c.seguro_porcentaje),
});

export function Ajustes() {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ['configuracion'],
    queryFn: () => api<{ configuracion: Configuracion }>('/admin/configuracion').then((r) => r.configuracion),
  });
  const [form, setForm] = useState<Configuracion | null>(null);
  useEffect(() => {
    if (data) setForm(normalizar(data));
  }, [data]);

  const guardar = useAccion(
    (c: Configuracion) => {
      const { moneda: _m, actualizado_en: _a, ...cambios } = c;
      return api('/admin/configuracion', { method: 'PUT', body: { ...cambios, email_soporte: cambios.email_soporte || null } });
    },
    { exito: 'Ajustes guardados', invalidar: ['configuracion'] },
  );

  if (error) return <ErrorCarga error={error} reintentar={() => void refetch()} />;

  const set = <K extends keyof Configuracion>(k: K, v: Configuracion[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const ejemplo = form ? Math.round(2000 * (form.gastos_gestion_porcentaje / 100)) + form.gastos_gestion_fijo_centimos : 0;
  const cambiado = form && data && JSON.stringify(form) !== JSON.stringify(normalizar(data));

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (form) guardar.mutate(form);
  }

  return (
    <form onSubmit={enviar}>
      <Cabecera titulo="Ajustes" subtitulo={data ? `Última modificación ${haceCuanto(data.actualizado_en)}` : 'Configuración de la plataforma'}>
        <Boton type="submit" variante="primario" disabled={!cambiado} cargando={guardar.isPending}>
          Guardar cambios
        </Boton>
      </Cabecera>

      {isPending || !form ? (
        <div className="tarjeta tarjeta-cuerpo">
          <Esqueleto alto={160} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <section className="tarjeta">
            <div className="tarjeta-cab">
              <h2>Precios y comisiones</h2>
            </div>
            <div className="tarjeta-cuerpo formulario-ajustes">
              <div className="campo">
                <label htmlFor="g-pct">Gastos de gestión (%)</label>
                <input id="g-pct" className="entrada" type="number" min={0} max={30} step={0.1} value={form.gastos_gestion_porcentaje} onChange={(e) => set('gastos_gestion_porcentaje', Number(e.target.value))} />
                <span className="ayuda">Los paga el comprador sobre el precio de la entrada.</span>
              </div>
              <div className="campo">
                <label htmlFor="g-fijo">Gastos fijos por entrada (€)</label>
                <input id="g-fijo" className="entrada" type="number" min={0} max={10} step={0.05} value={form.gastos_gestion_fijo_centimos / 100} onChange={(e) => set('gastos_gestion_fijo_centimos', Math.round(Number(e.target.value) * 100))} />
                <span className="ayuda">Ejemplo: entrada de 20 € → {dinero(ejemplo)} de gastos.</span>
              </div>
              <div className="campo">
                <label htmlFor="comision">Comisión al organizador (%)</label>
                <input id="comision" className="entrada" type="number" min={0} max={30} step={0.1} value={form.comision_plataforma_porcentaje} onChange={(e) => set('comision_plataforma_porcentaje', Number(e.target.value))} />
                <span className="ayuda">Se descuenta de lo que cobra el organizador con Stripe Connect.</span>
              </div>
              <div className="campo">
                <label htmlFor="seguro">Protección de reembolso (%)</label>
                <input id="seguro" className="entrada" type="number" min={0} max={30} step={0.5} value={form.seguro_porcentaje} onChange={(e) => set('seguro_porcentaje', Number(e.target.value))} />
                <span className="ayuda">Precio opcional que paga el comprador para poder reclamar si no puede ir.</span>
              </div>
              <div className="campo">
                <label htmlFor="reserva">Tiempo para pagar (minutos)</label>
                <input id="reserva" className="entrada" type="number" min={3} max={60} value={form.minutos_reserva} onChange={(e) => set('minutos_reserva', Number(e.target.value))} />
                <span className="ayuda">Las entradas quedan reservadas mientras el comprador paga.</span>
              </div>
            </div>
          </section>

          <section className="tarjeta">
            <div className="tarjeta-cab">
              <h2>Plataforma</h2>
            </div>
            <div className="tarjeta-cuerpo" style={{ paddingTop: 4, paddingBottom: 4 }}>
              <div className="fila-interruptor">
                <div>
                  <strong>Registro abierto</strong>
                  <span>Permite crear cuentas nuevas desde la app.</span>
                </div>
                <Interruptor activo={form.registro_abierto} onCambio={(v) => set('registro_abierto', v)} etiqueta="Registro abierto" />
              </div>
              <div className="fila-interruptor">
                <div>
                  <strong>Modo mantenimiento</strong>
                  <span>La app muestra un aviso en lugar de vender.</span>
                </div>
                <Interruptor activo={form.mantenimiento} onCambio={(v) => set('mantenimiento', v)} etiqueta="Modo mantenimiento" />
              </div>
              {form.mantenimiento && (
                <div className="campo" style={{ padding: '14px 0' }}>
                  <label htmlFor="msg">Mensaje de mantenimiento</label>
                  <input id="msg" className="entrada" value={form.mensaje_mantenimiento ?? ''} onChange={(e) => set('mensaje_mantenimiento', e.target.value || null)} placeholder="Volvemos en unos minutos" />
                </div>
              )}
              <div className="campo" style={{ padding: '14px 0' }}>
                <label htmlFor="soporte">Email de soporte</label>
                <input id="soporte" className="entrada" type="email" value={form.email_soporte ?? ''} onChange={(e) => set('email_soporte', e.target.value || null)} placeholder="soporte@kroosmaster.com" />
              </div>
            </div>
          </section>
        </div>
      )}
    </form>
  );
}
