import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { cuandoEs, plural } from '../lib/formato';
import type { Entrada } from '../lib/tipos';
import { color, espacio, radio } from '../theme';
import { Fila, Icono, Insignia, Pulsable, T } from './base';
import { ImagenEvento } from './evento';

const ESTADO: Record<Entrada['estado'], { texto: string; tono: 'acento' | 'neutro' | 'peligro' | 'info' } | null> = {
  valida: null,
  usada: { texto: 'Usada', tono: 'neutro' },
  anulada: { texto: 'Anulada', tono: 'peligro' },
  reembolsada: { texto: 'Reembolsada', tono: 'info' },
};

/** Entradas de un mismo evento agrupadas como un billete físico. */
export function BilleteEvento({ entradas, onPress }: { entradas: Entrada[]; onPress: () => void }) {
  const e = entradas[0]!;
  const validas = entradas.filter((x) => x.estado === 'valida').length;
  const tramos = [...new Set(entradas.map((x) => x.tramo.nombre))].join(' · ');
  const estado = validas === 0 ? ESTADO[entradas[0]!.estado] : null;
  return (
    <Pulsable onPress={onPress} style={s.billete} escala={0.98} accessibilityLabel={`${e.evento.titulo}, ${plural(entradas.length, 'entrada', 'entradas')}`}>
      <View>
        <ImagenEvento uri={e.evento.imagen_url} categoria={e.evento.categoria} style={{ height: 132 }} r={0} />
        <LinearGradient colors={['transparent', 'rgba(21,21,29,0.95)']} style={StyleSheet.absoluteFill} />
        <View style={s.billeteTitulo}>
          <T v="subtitulo" numberOfLines={2}>
            {e.evento.titulo}
          </T>
        </View>
        {entradas.length > 1 && (
          <View style={s.contador}>
            <T v="nota" c="acentoTexto" style={{ fontWeight: '800' }}>
              ×{entradas.length}
            </T>
          </View>
        )}
      </View>

      {/* Línea de corte con muescas, como un billete */}
      <View style={s.corte}>
        <View style={[s.muesca, { left: -12 }]} />
        <View style={s.punteado} />
        <View style={[s.muesca, { right: -12 }]} />
      </View>

      <Fila style={{ padding: espacio.l, paddingTop: espacio.s }} gap={espacio.m}>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="cuerpoFuerte">{cuandoEs(e.evento.inicia_en)}</T>
          <T v="nota" c="texto2" numberOfLines={1}>
            {e.evento.recinto} · {e.evento.ciudad}
          </T>
          <T v="nota" c="texto3" numberOfLines={1}>
            {tramos}
          </T>
        </View>
        {estado ? (
          <Insignia texto={estado.texto} tono={estado.tono} />
        ) : (
          <View style={s.qr}>
            <Icono n="qr-code" tam={22} c={color.acentoTexto} />
          </View>
        )}
      </Fila>
    </Pulsable>
  );
}

const s = StyleSheet.create({
  billete: { borderRadius: radio.xl, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde, overflow: 'hidden' },
  billeteTitulo: { position: 'absolute', left: espacio.l, right: espacio.l, bottom: espacio.s },
  contador: { position: 'absolute', top: espacio.m, right: espacio.m, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radio.total, backgroundColor: color.acento },
  corte: { height: 24, justifyContent: 'center' },
  muesca: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: color.fondo, borderWidth: 1, borderColor: color.borde },
  punteado: { marginHorizontal: espacio.l, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: color.bordeFuerte },
  qr: { width: 44, height: 44, borderRadius: radio.m, backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center' },
});
