import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, BotonIcono, Chip, Fila, Icono, Pulsable, T } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { FilaEvento, TarjetaDestacada, TarjetaEvento } from '../../components/evento';
import { TituloSeccion } from '../../components/pantalla';
import { useAuth } from '../../lib/auth';
import { useCiudades, useEventos, useNotificaciones } from '../../lib/consultas';
import type { PropsPestana } from '../../navigation/tipos';
import { CATEGORIAS, color, espacio, radio } from '../../theme';

const CLAVE_CIUDAD = 'km.ciudad';

/** Domingo a las 23:59 de esta semana. */
function finDeSemana(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  d.setHours(23, 59, 59, 0);
  return d.toISOString();
}

function saludo(): string {
  const h = new Date().getHours();
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

export function ExplorarScreen({ navigation }: PropsPestana<'Explorar'>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const anchoMax = Math.min(width, 520);
  const { usuario } = useAuth();
  const [ciudad, setCiudad] = useState<string | undefined>();
  const [eligiendoCiudad, setEligiendoCiudad] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLAVE_CIUDAD).then((c) => c && setCiudad(c)).catch(() => undefined);
  }, []);
  const elegirCiudad = (c: string | undefined) => {
    setCiudad(c);
    setEligiendoCiudad(false);
    void AsyncStorage.setItem(CLAVE_CIUDAD, c ?? '').catch(() => undefined);
  };

  const destacados = useEventos({ destacados: true, ciudad });
  const semana = useEventos({ ciudad, hasta: useMemo(finDeSemana, []) });
  const proximos = useEventos({ ciudad });
  const { data: notificaciones } = useNotificaciones();
  const sinLeer = notificaciones?.filter((n) => !n.leida).length ?? 0;

  const listaDestacados = destacados.data?.pages.flatMap((p) => p.eventos) ?? [];
  const listaSemana = semana.data?.pages.flatMap((p) => p.eventos) ?? [];
  const listaProximos = proximos.data?.pages.flatMap((p) => p.eventos) ?? [];
  const anchoDestacada = anchoMax - espacio.xl * 2 - 24;

  const [indice, setIndice] = useState(0);
  const recargando = destacados.isRefetching || proximos.isRefetching;
  const recargar = () => {
    void destacados.refetch();
    void semana.refetch();
    void proximos.refetch();
  };
  const abrir = (id: string) => navigation.navigate('Evento', { id });

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + espacio.l, paddingBottom: espacio.enorme }}
        refreshControl={<RefreshControl refreshing={recargando} onRefresh={recargar} tintColor={color.acento} colors={[color.acento]} />}
        onMomentumScrollEnd={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y > contentSize.height - 400 && proximos.hasNextPage && !proximos.isFetchingNextPage) {
            void proximos.fetchNextPage();
          }
        }}
      >
        {/* Cabecera */}
        <View style={s.cabecera}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="nota" c="texto2">
              {saludo()}
              {usuario?.nombre ? `, ${usuario.nombre.split(' ')[0]}` : ''} 👋
            </T>
            <Pulsable onPress={() => setEligiendoCiudad(true)} style={s.ciudad} accessibilityLabel="Cambiar ciudad" escala={0.98}>
              <T v="titulo">{ciudad ?? 'Toda España'}</T>
              <Icono n="chevron-down" tam={20} c={color.acento} />
            </Pulsable>
          </View>
          <View>
            <BotonIcono n="notifications-outline" etiqueta="Notificaciones" onPress={() => navigation.navigate(usuario ? 'Notificaciones' : 'Acceso')} />
            {sinLeer > 0 && (
              <View style={s.badge}>
                <T v="mini" c="acentoTexto" style={{ fontSize: 10, letterSpacing: 0 }}>
                  {sinLeer}
                </T>
              </View>
            )}
          </View>
        </View>

        {/* Buscador */}
        <Pulsable onPress={() => navigation.navigate('Buscar')} style={s.buscador} escala={0.98} accessibilityLabel="Buscar eventos">
          <Icono n="search" tam={20} c={color.texto3} />
          <T c="texto3">Artistas, salas, festivales…</T>
        </Pulsable>

        {/* Categorías */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carrilChips}>
          {CATEGORIAS.map((c) => (
            <Chip key={c.id} texto={c.nombre} icono={c.icono} onPress={() => navigation.navigate('Buscar', { categoria: c.id })} />
          ))}
        </ScrollView>

        {destacados.error && proximos.error ? (
          <ErrorEstado error={proximos.error} reintentar={recargar} />
        ) : (
          <>
            {/* Destacados */}
            {(destacados.isPending || listaDestacados.length > 0) && (
              <>
                <View style={s.margen}>
                  <TituloSeccion titulo="No te lo pierdas" />
                </View>
                {destacados.isPending ? (
                  <View style={s.margen}>
                    <Esqueleto ancho={anchoDestacada} alto={anchoDestacada * 1.12} r={radio.xxl} />
                  </View>
                ) : (
                  <>
                    <FlatList
                      horizontal
                      data={listaDestacados}
                      keyExtractor={(e) => e.id}
                      showsHorizontalScrollIndicator={false}
                      snapToInterval={anchoDestacada + espacio.m}
                      decelerationRate="fast"
                      contentContainerStyle={{ paddingHorizontal: espacio.xl, gap: espacio.m }}
                      onScroll={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / (anchoDestacada + espacio.m)))}
                      scrollEventThrottle={32}
                      renderItem={({ item }) => <TarjetaDestacada evento={item} ancho={anchoDestacada} onPress={() => abrir(item.id)} />}
                    />
                    {listaDestacados.length > 1 && (
                      <Fila gap={6} style={{ justifyContent: 'center', marginTop: espacio.m }}>
                        {listaDestacados.map((e, i) => (
                          <View key={e.id} style={[s.punto, i === indice && s.puntoActivo]} />
                        ))}
                      </Fila>
                    )}
                  </>
                )}
              </>
            )}

            {/* Esta semana */}
            {listaSemana.length > 0 && (
              <>
                <View style={s.margen}>
                  <TituloSeccion titulo="Esta semana" />
                </View>
                <FlatList
                  horizontal
                  data={listaSemana}
                  keyExtractor={(e) => e.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: espacio.xl, gap: espacio.l }}
                  renderItem={({ item }) => <TarjetaEvento evento={item} onPress={() => abrir(item.id)} />}
                />
              </>
            )}

            {/* Próximos */}
            <View style={s.margen}>
              <TituloSeccion
                titulo="Próximos eventos"
              />
              {proximos.isPending ? (
                Array.from({ length: 4 }, (_, i) => (
                  <Fila key={i} gap={espacio.l} style={{ paddingVertical: espacio.m }}>
                    <Esqueleto ancho={92} alto={92} r={radio.l} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <Esqueleto ancho="85%" />
                      <Esqueleto ancho="55%" alto={12} />
                      <Esqueleto ancho="40%" alto={12} />
                    </View>
                  </Fila>
                ))
              ) : listaProximos.length === 0 ? (
                <Vacio
                  icono="calendar-outline"
                  titulo={ciudad ? `Nada en ${ciudad} por ahora` : 'Aún no hay eventos'}
                  texto={ciudad ? 'Prueba con otra ciudad o mira todo lo que hay en España.' : 'Vuelve pronto: se publican eventos nuevos cada semana.'}
                  accion={ciudad ? <Boton v="secundario" bloque={false} onPress={() => elegirCiudad(undefined)}>Ver toda España</Boton> : undefined}
                />
              ) : (
                <>
                  {listaProximos.map((e) => (
                    <FilaEvento key={e.id} evento={e} onPress={() => abrir(e.id)} />
                  ))}
                  {proximos.hasNextPage && (
                    <Boton v="secundario" cargando={proximos.isFetchingNextPage} onPress={() => void proximos.fetchNextPage()} style={{ marginTop: espacio.m }}>
                      Ver más eventos
                    </Boton>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <SelectorCiudad visible={eligiendoCiudad} actual={ciudad} onElegir={elegirCiudad} onCerrar={() => setEligiendoCiudad(false)} />
    </View>
  );
}

function SelectorCiudad({ visible, actual, onElegir, onCerrar }: { visible: boolean; actual?: string; onElegir: (c?: string) => void; onCerrar: () => void }) {
  const { data } = useCiudades();
  const insets = useSafeAreaInsets();
  const opciones = [{ nombre: undefined as string | undefined, eventos: data?.reduce((a, c) => a + c.eventos, 0) ?? 0 }, ...(data ?? [])];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable style={s.velo} onPress={onCerrar} accessibilityLabel="Cerrar" />
      <View style={[s.hoja, { paddingBottom: insets.bottom + espacio.l }]}>
        <View style={s.asa} />
        <T v="subtitulo" style={{ marginBottom: espacio.m }}>
          ¿Dónde buscas planes?
        </T>
        {opciones.map((c) => {
          const activa = c.nombre === actual;
          return (
            <Pulsable key={c.nombre ?? 'todas'} onPress={() => onElegir(c.nombre)} style={s.opcion} escala={0.98} accessibilityState={{ selected: activa }}>
              <Icono n={c.nombre ? 'location-outline' : 'globe-outline'} c={activa ? color.acento : color.texto2} />
              <T v="cuerpoFuerte" style={{ flex: 1 }}>
                {c.nombre ?? 'Toda España'}
              </T>
              <T v="nota" c="texto3">
                {c.eventos}
              </T>
              {activa && <Icono n="checkmark" c={color.acento} />}
            </Pulsable>
          );
        })}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: espacio.xl, gap: espacio.m },
  ciudad: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center' },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, marginHorizontal: espacio.xl, marginTop: espacio.xl, height: 52, paddingHorizontal: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  carrilChips: { paddingHorizontal: espacio.xl, gap: espacio.s, paddingTop: espacio.l },
  margen: { paddingHorizontal: espacio.xl },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.bordeFuerte },
  puntoActivo: { width: 18, backgroundColor: color.acento },
  velo: { flex: 1, backgroundColor: color.velo },
  hoja: { backgroundColor: color.superficie, borderTopLeftRadius: radio.xxl, borderTopRightRadius: radio.xxl, padding: espacio.xl, gap: 2 },
  asa: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: color.bordeFuerte, marginBottom: espacio.l },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, minHeight: 52, paddingHorizontal: espacio.s, borderRadius: radio.m },
});
