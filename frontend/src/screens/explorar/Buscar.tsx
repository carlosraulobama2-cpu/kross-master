import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Fila, Icono, Pulsable, T } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { FilaEvento } from '../../components/evento';
import { useEventos, type FiltrosEventos } from '../../lib/consultas';
import { plural } from '../../lib/formato';
import type { PropsPestana } from '../../navigation/tipos';
import { CATEGORIAS, color, espacio, radio, tipo } from '../../theme';

type Cuando = 'cualquiera' | 'hoy' | 'manana' | 'finde' | 'semana' | 'mes';
const CUANDO: { id: Cuando; nombre: string }[] = [
  { id: 'cualquiera', nombre: 'Cualquier fecha' },
  { id: 'hoy', nombre: 'Hoy' },
  { id: 'manana', nombre: 'Mañana' },
  { id: 'finde', nombre: 'Este finde' },
  { id: 'semana', nombre: '7 días' },
  { id: 'mes', nombre: 'Este mes' },
];

/** Rango de fechas (desde/hasta) para cada atajo. */
export function rangoCuando(c: Cuando, ahora = new Date()): { desde?: string; hasta?: string } {
  const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const finDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
  const mas = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  switch (c) {
    case 'hoy':
      return { hasta: finDia(ahora).toISOString() };
    case 'manana':
      return { desde: inicioDia(mas(ahora, 1)).toISOString(), hasta: finDia(mas(ahora, 1)).toISOString() };
    case 'finde': {
      // Del viernes a las 15:00 al domingo; si ya es finde, desde ahora.
      const dia = ahora.getDay();
      const hastaDomingo = (7 - dia) % 7;
      const viernes = new Date(mas(ahora, dia === 0 ? -2 : 5 - dia).setHours(15));
      return { desde: (viernes > ahora ? viernes : ahora).toISOString(), hasta: finDia(mas(ahora, hastaDomingo)).toISOString() };
    }
    case 'semana':
      return { hasta: finDia(mas(ahora, 7)).toISOString() };
    case 'mes':
      return { hasta: finDia(new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)).toISOString() };
    default:
      return {};
  }
}

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
  const [cuando, setCuando] = useState<Cuando>('cualquiera');
  const [accesible, setAccesible] = useState(false);
  const entrada = useRef<TextInput>(null);

  useEffect(() => {
    if (route.params?.categoria) setCategoria(route.params.categoria);
  }, [route.params?.categoria]);

  // Busca 300 ms después de dejar de escribir.
  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const fechas = useMemo(() => rangoCuando(cuando), [cuando]);
  const consulta = useEventos({ q: q || undefined, categoria, orden, ...fechas, accesible });
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.carril, { paddingTop: 0 }]} style={{ flexGrow: 0 }}>
        {CUANDO.map((c) => (
          <Chip key={c.id} texto={c.nombre} icono={c.id === 'cualquiera' ? 'calendar-outline' : undefined} activo={cuando === c.id} onPress={() => setCuando(c.id)} />
        ))}
        <Chip texto="Accesible" icono="accessibility-outline" activo={accesible} onPress={() => setAccesible((v) => !v)} />
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
              texto={q ? `No encontramos nada para «${q}». Prueba con otra palabra o quita filtros.` : 'No hay eventos con estos filtros. Prueba con otras fechas o categorías.'}
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
