import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { cuandoEs, diaCorto, precio } from '../lib/formato';
import type { EventoResumen } from '../lib/tipos';
import { CATEGORIAS, color, espacio, radio, type Categoria } from '../theme';
import { Fila, Icono, Insignia, Pulsable, T } from './base';

/** Degradado por categoría: se ve mientras carga la foto o si no la hay. */
const DEGRADADOS: Record<Categoria, [string, string]> = {
  conciertos: ['#3A1C71', '#D76D77'],
  festivales: ['#0F2027', '#2C9A6B'],
  clubbing: ['#141E30', '#6A3093'],
  teatro: ['#42275A', '#734B6D'],
  deportes: ['#0B486B', '#3B8D99'],
  otros: ['#232526', '#5A5F66'],
};

export function ImagenEvento({ uri, categoria, style, r = radio.l }: { uri: string | null; categoria: Categoria; style?: StyleProp<ViewStyle>; r?: number }) {
  const icono = CATEGORIAS.find((c) => c.id === categoria)?.icono ?? 'sparkles';
  return (
    <View style={[{ overflow: 'hidden', borderRadius: r, backgroundColor: color.superficie2 }, style]}>
      <LinearGradient colors={DEGRADADOS[categoria] ?? DEGRADADOS.otros} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: 0.35 }]}>
        <Icono n={icono} tam={40} c={color.blanco} />
      </View>
      {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} cachePolicy="memory-disk" accessibilityIgnoresInvertColors />}
    </View>
  );
}

function Fecha({ iso }: { iso: string }) {
  const { dia, mes } = diaCorto(iso);
  return (
    <View style={s.fecha}>
      <T v="mini" c="acento" style={{ letterSpacing: 0.5 }}>
        {mes}
      </T>
      <T v="subtitulo" style={{ lineHeight: 22 }}>
        {dia}
      </T>
    </View>
  );
}

function etiquetaDisponibilidad(e: EventoResumen) {
  if (e.aforo > 0 && e.disponibles === 0) return <Insignia texto="Agotado" tono="peligro" />;
  if (e.aforo > 0 && e.disponibles / e.aforo < 0.15) return <Insignia texto="Últimas entradas" tono="aviso" icono="flame" />;
  return null;
}

/** Tarjeta grande para el carrusel de destacados. */
export function TarjetaDestacada({ evento, onPress, ancho }: { evento: EventoResumen; onPress: () => void; ancho: number }) {
  return (
    <Pulsable onPress={onPress} style={{ width: ancho }} accessibilityLabel={`${evento.titulo}, ${cuandoEs(evento.inicia_en)}`}>
      <ImagenEvento uri={evento.imagen_url} categoria={evento.categoria} style={{ width: ancho, height: ancho * 1.12 }} r={radio.xxl} />
      <LinearGradient colors={['transparent', 'rgba(5,5,8,0.55)', 'rgba(5,5,8,0.96)']} locations={[0.35, 0.6, 1]} style={[StyleSheet.absoluteFill, { borderRadius: radio.xxl }]} />
      <View style={s.destacadaArriba}>
        <Insignia texto="Destacado" tono="acento" icono="star" />
        {etiquetaDisponibilidad(evento)}
      </View>
      <View style={s.destacadaAbajo}>
        <T v="nota" c="acento" style={{ fontWeight: '700' }}>
          {cuandoEs(evento.inicia_en)}
        </T>
        <T v="titulo" numberOfLines={2}>
          {evento.titulo}
        </T>
        <Fila style={{ justifyContent: 'space-between', marginTop: espacio.xs }}>
          <Fila gap={4} style={{ flex: 1 }}>
            <Icono n="location-outline" tam={15} c={color.texto2} />
            <T v="nota" c="texto2" numberOfLines={1} style={{ flex: 1 }}>
              {evento.recinto} · {evento.ciudad}
            </T>
          </Fila>
          <View style={s.precioPastilla}>
            <T v="nota" c="acentoTexto" style={{ fontWeight: '800' }}>
              {evento.precio_desde_centimos ? `Desde ${precio(evento.precio_desde_centimos)}` : 'Gratis'}
            </T>
          </View>
        </Fila>
      </View>
    </Pulsable>
  );
}

/** Fila compacta para listados. */
export function FilaEvento({ evento, onPress }: { evento: EventoResumen; onPress: () => void }) {
  return (
    <Pulsable onPress={onPress} style={s.fila} escala={0.98} accessibilityLabel={`${evento.titulo}, ${cuandoEs(evento.inicia_en)}`}>
      <View>
        <ImagenEvento uri={evento.imagen_url} categoria={evento.categoria} style={{ width: 92, height: 92 }} r={radio.l} />
        <View style={{ position: 'absolute', top: 6, left: 6 }}>
          <Fecha iso={evento.inicia_en} />
        </View>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <T v="cuerpoFuerte" numberOfLines={2} style={{ fontWeight: '700' }}>
          {evento.titulo}
        </T>
        <T v="nota" c="texto2" numberOfLines={1}>
          {cuandoEs(evento.inicia_en)}
        </T>
        <T v="nota" c="texto3" numberOfLines={1}>
          {evento.recinto} · {evento.ciudad}
        </T>
        <Fila style={{ marginTop: 4, justifyContent: 'space-between' }}>
          <T v="nota" style={{ fontWeight: '800' }}>
            {evento.precio_desde_centimos ? `Desde ${precio(evento.precio_desde_centimos)}` : 'Gratis'}
          </T>
          {etiquetaDisponibilidad(evento)}
        </Fila>
      </View>
    </Pulsable>
  );
}

/** Tarjeta mediana para carruseles secundarios. */
export function TarjetaEvento({ evento, onPress, ancho = 220 }: { evento: EventoResumen; onPress: () => void; ancho?: number }) {
  return (
    <Pulsable onPress={onPress} style={{ width: ancho, gap: espacio.s }} accessibilityLabel={evento.titulo}>
      <View>
        <ImagenEvento uri={evento.imagen_url} categoria={evento.categoria} style={{ width: ancho, height: ancho * 0.66 }} />
        <View style={{ position: 'absolute', top: 8, left: 8 }}>
          <Fecha iso={evento.inicia_en} />
        </View>
      </View>
      <T v="cuerpoFuerte" numberOfLines={1} style={{ fontWeight: '700' }}>
        {evento.titulo}
      </T>
      <T v="nota" c="texto2" numberOfLines={1} style={{ marginTop: -6 }}>
        {evento.ciudad} · {evento.precio_desde_centimos ? `desde ${precio(evento.precio_desde_centimos)}` : 'gratis'}
      </T>
    </Pulsable>
  );
}

const s = StyleSheet.create({
  fecha: { alignItems: 'center', minWidth: 44, paddingVertical: 4, paddingHorizontal: 6, borderRadius: radio.m, backgroundColor: 'rgba(11,11,16,0.86)' },
  destacadaArriba: { position: 'absolute', top: espacio.l, left: espacio.l, right: espacio.l, flexDirection: 'row', gap: espacio.s },
  destacadaAbajo: { position: 'absolute', left: espacio.xl, right: espacio.xl, bottom: espacio.xl, gap: 4 },
  precioPastilla: { backgroundColor: color.acento, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radio.total },
  fila: { flexDirection: 'row', gap: espacio.l, alignItems: 'center', paddingVertical: espacio.m },
});
