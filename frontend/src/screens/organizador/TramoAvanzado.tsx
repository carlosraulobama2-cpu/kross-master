import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Chip, Fila, Icono, T } from '../../components/base';
import { Esqueleto } from '../../components/estados';
import { Campo, Contador } from '../../components/formulario';
import { Cabecera, Pantalla, TituloSeccion } from '../../components/pantalla';
import { useAsientos } from '../../components/plano';
import { api, mensajeDe } from '../../lib/api';
import { invalidarYo, useEventoGestion } from '../../lib/consultas';
import { haptica } from '../../lib/haptica';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

/** Plano de butacas numeradas y fase automática de un tipo de entrada. */
export function TramoAvanzadoScreen({ route }: PropsPantalla<'TramoAvanzado'>) {
  const { eventoId, tramoId } = route.params;
  const { data: evento } = useEventoGestion(eventoId);
  const { data: asientos } = useAsientos(eventoId, tramoId);
  const qc = useQueryClient();
  const avisar = useAviso();
  const [filas, setFilas] = useState(8);
  const [porFila, setPorFila] = useState(12);
  const [seccion, setSeccion] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const tramo = evento?.tramos.find((t) => t.id === tramoId);
  const otros = (evento?.tramos ?? []).filter((t) => t.id !== tramoId);
  const conVentas = Boolean(tramo && tramo.cantidad_vendida + tramo.cantidad_reservada > 0);

  async function guardar(clave: string, fn: () => Promise<unknown>, exito: string) {
    setOcupado(clave);
    try {
      await fn();
      haptica.exito();
      avisar(exito, 'exito');
      await invalidarYo(qc);
      await qc.invalidateQueries({ queryKey: ['asientos', eventoId, tramoId] });
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setOcupado(null);
    }
  }

  if (!tramo) {
    return (
      <Pantalla cabecera={<Cabecera titulo="Tipo de entrada" />}>
        <Esqueleto alto={200} r={radio.l} />
      </Pantalla>
    );
  }

  return (
    <Pantalla cabecera={<Cabecera titulo={tramo.nombre} />}>
      <TituloSeccion titulo="Butacas numeradas" />
      <View style={s.tarjeta}>
        {tramo.numerado ? (
          <Fila gap={espacio.m}>
            <Icono n="grid" c={color.acento} />
            <View style={{ flex: 1 }}>
              <T v="cuerpoFuerte">Plano activo · {asientos?.length ?? tramo.cantidad_total} butacas</T>
              <T v="nota" c="texto2">
                Los compradores eligen su sitio o usan «mejor sitio». {asientos ? `${asientos.filter((a) => a.estado === 'libre').length} libres.` : ''}
              </T>
            </View>
          </Fila>
        ) : (
          <T c="texto2">Ahora es entrada general (sin sitio). Genera un plano para vender con butaca.</T>
        )}
      </View>
      {conVentas ? (
        <T v="nota" c="texto3" style={{ marginTop: espacio.s }}>
          Ya hay ventas: el plano no se puede cambiar.
        </T>
      ) : (
        <View style={{ gap: espacio.m, marginTop: espacio.l }}>
          <Fila style={{ justifyContent: 'space-between' }}>
            <T c="texto2">Filas (A, B, C…)</T>
            <Contador valor={filas} min={1} max={60} onCambio={setFilas} />
          </Fila>
          <Fila style={{ justifyContent: 'space-between' }}>
            <T c="texto2">Butacas por fila</T>
            <Contador valor={porFila} min={1} max={100} onCambio={setPorFila} />
          </Fila>
          <Campo etiqueta="Sección (opcional)" value={seccion} onChangeText={setSeccion} placeholder="Platea, Anfiteatro…" />
          <Boton
            icono="grid-outline"
            cargando={ocupado === 'plano'}
            onPress={() =>
              void guardar(
                'plano',
                () => api(`/organizador/eventos/${eventoId}/tramos/${tramoId}/plano`, { method: 'POST', body: { filas, porFila, seccion: seccion.trim() } }),
                `Plano creado: ${filas * porFila} butacas`,
              )
            }
          >
            {tramo.numerado ? 'Rehacer plano' : 'Crear plano'} · {filas * porFila} butacas
          </Boton>
          <T v="nota" c="texto3">
            El aforo de este tipo de entrada pasa a ser el número de butacas.
          </T>
        </View>
      )}

      <TituloSeccion titulo="Fase automática" />
      <T v="nota" c="texto2" style={{ marginTop: -espacio.s, marginBottom: espacio.m }}>
        Este tipo de entrada saldrá a la venta solo cuando se agote el que elijas. Ideal para «primera ola, segunda ola…».
      </T>
      <Fila gap={espacio.s} style={{ flexWrap: 'wrap' }}>
        <Chip
          texto="Siempre a la venta"
          activo={!tramo.fase_anterior_id}
          onPress={() => void guardar('fase', () => api(`/organizador/eventos/${eventoId}/tramos/${tramoId}`, { method: 'PATCH', body: { fase_anterior_id: null } }), 'Fase quitada')}
        />
        {otros.map((t) => (
          <Chip
            key={t.id}
            texto={`Al agotarse ${t.nombre}`}
            activo={tramo.fase_anterior_id === t.id}
            onPress={() => void guardar('fase', () => api(`/organizador/eventos/${eventoId}/tramos/${tramoId}`, { method: 'PATCH', body: { fase_anterior_id: t.id } }), `Abrirá al agotarse ${t.nombre}`)}
          />
        ))}
      </Fila>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  tarjeta: { padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
});
