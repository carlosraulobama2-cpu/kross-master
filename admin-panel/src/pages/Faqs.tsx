import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cabecera } from '../components/Layout';
import { IconoAyuda, IconoMas } from '../components/iconos';
import { Boton, ErrorCarga, FilasEsqueleto, Insignia, Interruptor, Modal, Vacio } from '../components/ui';
import { api, useAccion } from '../lib/hooks';

interface Faq {
  id: string;
  categoria: string;
  pregunta: string;
  respuesta: string;
  orden: number;
  activo: boolean;
}

type Borrador = Omit<Faq, 'id'> & { id?: string };
const NUEVA: Borrador = { categoria: 'General', pregunta: '', respuesta: '', orden: 0, activo: true };

/** Preguntas frecuentes del centro de ayuda de la app. */
export function Faqs() {
  const faqs = useQuery({ queryKey: ['faqs'], queryFn: () => api<{ faqs: Faq[] }>('/admin/faqs').then((r) => r.faqs) });
  const [editando, setEditando] = useState<Borrador | null>(null);

  const guardar = useAccion(
    ({ id, ...datos }: Borrador) => api(id ? `/admin/faqs/${id}` : '/admin/faqs', { method: id ? 'PATCH' : 'POST', body: datos }),
    { exito: 'Pregunta guardada', invalidar: ['faqs'] },
  );
  const borrar = useAccion((id: string) => api(`/admin/faqs/${id}`, { method: 'DELETE' }), { exito: 'Pregunta eliminada', invalidar: ['faqs'] });
  const alternar = useAccion(({ id, activo }: { id: string; activo: boolean }) => api(`/admin/faqs/${id}`, { method: 'PATCH', body: { activo } }), {
    exito: 'Visibilidad actualizada',
    invalidar: ['faqs'],
  });

  const valido = editando && editando.pregunta.trim().length >= 5 && editando.respuesta.trim().length >= 5 && editando.categoria.trim().length >= 2;

  return (
    <>
      <Cabecera
        titulo="Preguntas frecuentes"
        subtitulo="Lo que ven los fans en Perfil › Centro de ayuda"
      >
        <Boton variante="primario" onClick={() => setEditando(NUEVA)}>
          <IconoMas /> Nueva pregunta
        </Boton>
      </Cabecera>
      <section className="tarjeta">
        {faqs.error ? (
          <ErrorCarga error={faqs.error} reintentar={() => void faqs.refetch()} />
        ) : faqs.data && faqs.data.length === 0 ? (
          <Vacio icono={<IconoAyuda />} titulo="Sin preguntas" texto="Añade las dudas más habituales para ahorrar consultas" />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Pregunta</th>
                  <th>Visible</th>
                  <th className="derecha" />
                </tr>
              </thead>
              <tbody>
                {faqs.isPending ? (
                  <FilasEsqueleto columnas={4} />
                ) : (
                  faqs.data.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <Insignia tono="info">{f.categoria}</Insignia>
                      </td>
                      <td style={{ maxWidth: 480 }}>
                        <strong>{f.pregunta}</strong>
                        <div style={{ color: 'var(--texto-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.respuesta}</div>
                      </td>
                      <td>
                        <Interruptor activo={f.activo} etiqueta={`Visible: ${f.pregunta}`} onCambio={(activo) => alternar.mutate({ id: f.id, activo })} />
                      </td>
                      <td>
                        <div className="acciones">
                          <Boton pequeno onClick={() => setEditando(f)}>
                            Editar
                          </Boton>
                          <Boton pequeno variante="peligro" onClick={() => confirm('¿Eliminar esta pregunta?') && borrar.mutate(f.id)}>
                            Eliminar
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
      </section>

      <Modal
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        pie={
          <>
            <Boton onClick={() => setEditando(null)}>Cancelar</Boton>
            <Boton variante="primario" disabled={!valido} cargando={guardar.isPending} onClick={() => editando && guardar.mutate(editando, { onSuccess: () => setEditando(null) })}>
              Guardar
            </Boton>
          </>
        }
      >
        <h2>{editando?.id ? 'Editar pregunta' : 'Nueva pregunta'}</h2>
        {editando && (
          <>
            <div className="campo">
              <label htmlFor="categoria">Categoría</label>
              <input id="categoria" className="entrada" value={editando.categoria} onChange={(e) => setEditando({ ...editando, categoria: e.target.value })} placeholder="Compras, Entradas, Reembolsos…" />
            </div>
            <div className="campo">
              <label htmlFor="pregunta">Pregunta</label>
              <input id="pregunta" className="entrada" value={editando.pregunta} onChange={(e) => setEditando({ ...editando, pregunta: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="respuestaFaq">Respuesta</label>
              <textarea id="respuestaFaq" className="entrada" rows={6} value={editando.respuesta} onChange={(e) => setEditando({ ...editando, respuesta: e.target.value })} />
            </div>
            <div className="campo">
              <label htmlFor="orden">Orden dentro de la categoría</label>
              <input id="orden" className="entrada" type="number" min={0} value={editando.orden} onChange={(e) => setEditando({ ...editando, orden: Number(e.target.value) || 0 })} />
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
