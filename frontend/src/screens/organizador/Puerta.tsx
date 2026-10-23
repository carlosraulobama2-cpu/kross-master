import { View } from 'react-native';
import { Fila, Icono, Pulsable, T } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { ImagenEvento } from '../../components/evento';
import { Cabecera, Pantalla } from '../../components/pantalla';
import { useEventosPuerta } from '../../lib/consultas';
import { cuandoEs } from '../../lib/formato';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

export function PuertaScreen({ navigation }: PropsPantalla<'Puerta'>) {
  const { data, error, isPending, refetch, isRefetching } = useEventosPuerta();
  return (
    <Pantalla cabecera={<Cabecera titulo="Control de acceso" />} recargar={() => void refetch()} recargando={isRefetching}>
      <T c="texto2" style={{ marginBottom: espacio.xl }}>
        Elige el evento en el que estás trabajando para empezar a escanear.
      </T>
      {error ? (
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      ) : isPending ? (
        <View style={{ gap: espacio.s }}>
          {[0, 1].map((i) => (
            <Esqueleto key={i} alto={84} r={radio.l} />
          ))}
        </View>
      ) : data.length === 0 ? (
        <Vacio icono="scan-outline" titulo="No tienes eventos asignados" texto="Pide al organizador que te añada a su equipo de puerta con tu email." />
      ) : (
        <View style={{ gap: espacio.s }}>
          {data.map((e) => (
            <Pulsable
              key={e.id}
              onPress={() => navigation.navigate('Escaner', { eventoId: e.id, titulo: e.titulo })}
              escala={0.98}
              style={{ flexDirection: 'row', alignItems: 'center', gap: espacio.m, padding: espacio.m, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde }}
            >
              <ImagenEvento uri={e.imagen_url} categoria={e.categoria} style={{ width: 60, height: 60 }} r={radio.m} />
              <View style={{ flex: 1 }}>
                <T v="cuerpoFuerte" numberOfLines={1}>
                  {e.titulo}
                </T>
                <T v="nota" c="texto2">
                  {cuandoEs(e.inicia_en)}
                </T>
                <T v="nota" c="texto3">
                  {e.recinto}
                </T>
              </View>
              <Fila gap={4}>
                <Icono n="scan" c={color.acento} />
              </Fila>
            </Pulsable>
          ))}
        </View>
      )}
    </Pantalla>
  );
}
