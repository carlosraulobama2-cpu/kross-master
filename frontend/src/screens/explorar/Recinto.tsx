import { Linking, Platform, View } from 'react-native';
import { Boton, Fila, T } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { FilaEvento, ImagenEvento } from '../../components/evento';
import { Cabecera, Pantalla, TituloSeccion } from '../../components/pantalla';
import { BotonSeguir } from '../../components/seguir';
import { useRecinto } from '../../lib/consultas';
import { plural } from '../../lib/formato';
import type { PropsPantalla } from '../../navigation/tipos';
import { espacio, radio } from '../../theme';
import { AntesDeIr } from './Evento';
import { traducir as tx } from '../../lib/i18n';

export function RecintoScreen({ navigation, route }: PropsPantalla<'Recinto'>) {
  const { data: r, error, refetch, isRefetching } = useRecinto(route.params.id);

  const abrirMapa = () => {
    if (!r) return;
    const destino = encodeURIComponent(`${r.nombre}, ${r.direccion ?? ''} ${r.ciudad}`);
    void Linking.openURL(Platform.OS === 'ios' ? `maps:0,0?q=${destino}` : `https://www.google.com/maps/search/?api=1&query=${destino}`);
  };

  return (
    <Pantalla cabecera={<Cabecera titulo={r?.nombre} />} recargar={() => void refetch()} recargando={isRefetching}>
      {error ? (
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      ) : !r ? (
        <Esqueleto alto={200} r={radio.xl} />
      ) : (
        <>
          <ImagenEvento uri={r.imagen_url ?? r.eventos[0]?.imagen_url ?? null} categoria={r.eventos[0]?.categoria ?? 'otros'} style={{ height: 180 }} r={radio.xl} />
          <Fila style={{ justifyContent: 'space-between', marginTop: espacio.l, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="titulo">{r.nombre}</T>
              <T c="texto2">{[r.direccion, r.ciudad].filter(Boolean).join(', ')}</T>
              <T v="nota" c="texto3">
                {plural(r.seguidores, 'seguidor', 'seguidores')}
                {r.aforo ? ` · aforo ${r.aforo.toLocaleString('es-ES')}` : ''}
              </T>
            </View>
            <BotonSeguir tipo="recintos" id={r.id} siguiendo={r.siguiendo} />
          </Fila>
          <Boton v="secundario" icono="navigate" onPress={abrirMapa} style={{ marginTop: espacio.l }}>
            {tx('Cómo llegar')}
          </Boton>
          <AntesDeIr evento={{ recinto_info: r, puertas_abren_en: null }} />
          <TituloSeccion titulo={tx('Próximos eventos')} />
          {r.eventos.length === 0 ? (
            <Vacio icono="calendar-outline" titulo={tx('No hay eventos anunciados')} texto={tx('Síguelo para enterarte el primero.')} />
          ) : (
            r.eventos.map((e) => <FilaEvento key={e.id} evento={e} onPress={() => navigation.push('Evento', { id: e.id })} />)
          )}
        </>
      )}
    </Pantalla>
  );
}
