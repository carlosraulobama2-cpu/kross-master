import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { Fila, Insignia, T } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { FilaEvento } from '../../components/evento';
import { Cabecera, Pantalla, TituloSeccion } from '../../components/pantalla';
import { BotonSeguir } from '../../components/seguir';
import { useArtista } from '../../lib/consultas';
import { plural } from '../../lib/formato';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';
import { traducir as tx } from '../../lib/i18n';

export function ArtistaScreen({ navigation, route }: PropsPantalla<'Artista'>) {
  const { data: a, error, refetch, isRefetching } = useArtista(route.params.id);
  return (
    <Pantalla cabecera={<Cabecera />} recargar={() => void refetch()} recargando={isRefetching}>
      {error ? (
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      ) : !a ? (
        <View style={{ alignItems: 'center', gap: espacio.m }}>
          <Esqueleto ancho={120} alto={120} r={60} />
          <Esqueleto ancho={200} alto={28} />
        </View>
      ) : (
        <>
          <View style={{ alignItems: 'center', gap: espacio.m }}>
            <LinearGradient colors={['#00FF87', '#0B486B']} style={s.avatar}>
              <T v="display" c="acentoTexto">
                {a.nombre[0]}
              </T>
            </LinearGradient>
            <T v="titulo" centro>
              {a.nombre}
            </T>
            <T c="texto2">{plural(a.seguidores, 'seguidor', 'seguidores')}</T>
            {a.generos.length > 0 && (
              <Fila gap={espacio.xs} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                {a.generos.map((g) => (
                  <Insignia key={g} texto={g} />
                ))}
              </Fila>
            )}
            <BotonSeguir tipo="artistas" id={a.id} siguiendo={a.siguiendo} />
          </View>
          {a.bio && (
            <T c="texto2" centro style={{ marginTop: espacio.xl }}>
              {a.bio}
            </T>
          )}
          <TituloSeccion titulo={tx('Próximas fechas')} />
          {a.eventos.length === 0 ? (
            <Vacio icono="calendar-outline" titulo={tx('Sin fechas por ahora')} texto={tx('Síguelo y te avisaremos en cuanto anuncie conciertos.')} />
          ) : (
            a.eventos.map((e) => <FilaEvento key={e.id} evento={e} onPress={() => navigation.push('Evento', { id: e.id })} />)
          )}
        </>
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  avatar: { width: 120, height: 120, borderRadius: radio.total, alignItems: 'center', justifyContent: 'center' },
});
