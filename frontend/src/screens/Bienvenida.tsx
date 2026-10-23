import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Fila, Icono, Pulsable, T, type NombreIcono } from '../components/base';
import { color, espacio } from '../theme';

const DIAPOSITIVAS: { icono: NombreIcono; titulo: string; texto: string; colores: [string, string] }[] = [
  { icono: 'compass', titulo: 'Descubre planes cerca de ti', texto: 'Conciertos, festivales, teatro y deporte en tu ciudad, en un solo sitio.', colores: ['#3A1C71', '#0B0B10'] },
  { icono: 'flash', titulo: 'Compra en segundos', texto: 'Elige tus entradas y paga con Apple Pay, Google Pay o tarjeta. Sin colas ni esperas.', colores: ['#0F3D2E', '#0B0B10'] },
  { icono: 'qr-code', titulo: 'Tu entrada, imposible de copiar', texto: 'El QR cambia cada 30 segundos y funciona sin conexión. Envíasela a un amigo con un toque.', colores: ['#0B486B', '#0B0B10'] },
];

export function Bienvenida({ onTerminar }: { onTerminar: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [indice, setIndice] = useState(0);
  const lista = useRef<FlatList>(null);
  const ultima = indice === DIAPOSITIVAS.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <FlatList
        ref={lista}
        data={DIAPOSITIVAS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(d) => d.titulo}
        onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, flex: 1 }}>
            <LinearGradient colors={item.colores} style={StyleSheet.absoluteFill} />
            <View style={[s.diapositiva, { paddingTop: insets.top + 80 }]}>
              <View style={s.icono}>
                <Icono n={item.icono} tam={64} c={color.acento} />
              </View>
              <T v="display" centro style={{ maxWidth: 340 }}>
                {item.titulo}
              </T>
              <T c="texto2" centro style={{ maxWidth: 320, fontSize: 17, lineHeight: 25 }}>
                {item.texto}
              </T>
            </View>
          </View>
        )}
      />
      <View style={[s.pie, { paddingBottom: insets.bottom + espacio.xl }]}>
        <Fila gap={6} style={{ justifyContent: 'center' }}>
          {DIAPOSITIVAS.map((d, i) => (
            <View key={d.titulo} style={[s.punto, i === indice && s.puntoActivo]} />
          ))}
        </Fila>
        <Boton
          icono={ultima ? 'rocket' : 'arrow-forward'}
          onPress={() => (ultima ? onTerminar() : lista.current?.scrollToIndex({ index: indice + 1, animated: true }))}
        >
          {ultima ? 'Empezar' : 'Siguiente'}
        </Boton>
        <Pulsable onPress={onTerminar} style={{ alignSelf: 'center', padding: espacio.s, opacity: ultima ? 0 : 1 }} disabled={ultima}>
          <T v="cuerpoFuerte" c="texto3">
            Saltar
          </T>
        </Pulsable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  diapositiva: { flex: 1, alignItems: 'center', gap: espacio.xl, paddingHorizontal: espacio.xxl },
  icono: { width: 132, height: 132, borderRadius: 44, backgroundColor: 'rgba(0,255,135,0.1)', borderWidth: 1, borderColor: 'rgba(0,255,135,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: espacio.xl },
  pie: { position: 'absolute', left: espacio.xl, right: espacio.xl, bottom: 0, gap: espacio.l },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.bordeFuerte },
  puntoActivo: { width: 22, backgroundColor: color.acento },
});
