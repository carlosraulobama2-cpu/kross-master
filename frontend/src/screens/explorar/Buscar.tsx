import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Fila, Icono, Pulsable, T } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { FilaEvento } from '../../components/evento';
import { useEventos, type FiltrosEventos } from '../../lib/consultas';
import { plural } from '../../lib/formato';
import type { PropsPestana } from '../../navigation/tipos';
import { CATEGORIAS, color, espacio, radio, tipo } from '../../theme';

const ORDENES: { id: NonNullable<FiltrosEventos['orden']>; nombre: string }[] = [
  { id: 'fecha', nombre: 'Más próximos' },
  { id: 'precio', nombre: 'Más baratos' },
  { id: 'recientes', nombre: 'Novedades' },
];

export function BuscarScreen({ navigation, route }: PropsPestana<'Buscar'>) {
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState<string | undefined>(route.params?.categoria);
  const [orden, setOrden] = useState<FiltrosEventos['orden']>('fecha');
  const entrada = useRef<TextInput>(null);

  useEffect(() => {
    if (route.params?.categoria) setCategoria(route.params.categoria);
  }, [route.params?.categoria]);

  // Busca 300 ms después de dejar de escribir.
  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const consulta = useEventos({ q: q || undefined, categoria, orden });
  const eventos = consulta.data?.pages.flatMap((p) => p.eventos) ?? [];
  const total = consulta.data?.pages[0]?.total ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo, paddingTop: insets.top + espacio.l }}>
      <View style={{ paddingHorizontal: espacio.xl, gap: espacio.l }}>
        <T v="titulo">Buscar</T>
        <View style={s.buscador}>
          <Icono n="search" tam={20} c={color.texto3} />
          <TextInput
            ref={entrada}
            value={texto}
            onChangeText={setTexto}
            placeholder="Artistas, salas, ciudades…"
            placeholderTextColor={color.texto3}
            selectionColor={color.acento}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel="Buscar eventos"
            style={s.entrada}
          />
          {texto.length > 0 && (
            <Pulsable onPress={() => setTexto('')} accessibilityLabel="Borrar búsqueda" hitSlop={10}>
              <Icono n="close-circle" tam={20} c={color.texto3} />
            </Pulsable>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carril} style={{ flexGrow: 0 }}>
        <Chip texto="Todo" activo={!categoria} onPress={() => setCategoria(undefined)} />
        {CATEGORIAS.map((c) => (
          <Chip key={c.id} texto={c.nombre} icono={c.icono} activo={categoria === c.id} onPress={() => setCategoria(categoria === c.id ? undefined : c.id)} />
        ))}
      </ScrollView>

      <Fila style={s.barraOrden}>
        <T v="nota" c="texto2" style={{ flex: 1 }}>
          {consulta.isPending ? 'Buscando…' : plural(total, 'evento', 'eventos')}
        </T>
        {ORDENES.map((o) => (
          <Pulsable key={o.id} onPress={() => setOrden(o.id)} accessibilityState={{ selected: orden === o.id }} hitSlop={6}>
            <T v="nota" c={orden === o.id ? 'acento' : 'texto3'} style={{ fontWeight: '700' }}>
              {o.nombre}
            </T>
          </Pulsable>
        ))}
      </Fila>

      {consulta.error ? (
        <ErrorEstado error={consulta.error} reintentar={() => void consulta.refetch()} />
      ) : consulta.isPending ? (
        <View style={{ paddingHorizontal: espacio.xl }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Fila key={i} gap={espacio.l} style={{ paddingVertical: espacio.m }}>
              <Esqueleto ancho={92} alto={92} r={radio.l} />
              <View style={{ flex: 1, gap: 8 }}>
                <Esqueleto ancho="80%" />
                <Esqueleto ancho="50%" alto={12} />
              </View>
            </Fila>
          ))}
        </View>
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={(e) => e.id}
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingHorizontal: espacio.xl, paddingBottom: espacio.enorme }}
          renderItem={({ item }) => <FilaEvento evento={item} onPress={() => navigation.navigate('Evento', { id: item.id })} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => consulta.hasNextPage && !consulta.isFetchingNextPage && void consulta.fetchNextPage()}
          ListFooterComponent={consulta.isFetchingNextPage ? <ActivityIndicator color={color.acento} style={{ margin: espacio.xl }} /> : null}
          ListEmptyComponent={
            <Vacio
              icono="search-outline"
              titulo="Sin resultados"
              texto={q ? `No encontramos nada para «${q}». Prueba con otra palabra o quita filtros.` : 'No hay eventos en esta categoría ahora mismo.'}
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  buscador: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, height: 52, paddingHorizontal: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  entrada: { flex: 1, ...tipo.cuerpo, color: color.texto, height: '100%', outlineStyle: 'none' } as object,
  carril: { paddingHorizontal: espacio.xl, gap: espacio.s, paddingVertical: espacio.l },
  barraOrden: { paddingHorizontal: espacio.xl, paddingBottom: espacio.s, gap: espacio.l },
});
