import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptica } from '../lib/haptica';
import { color, espacio, radio, sombra } from '../theme';
import { Icono, T } from './base';

type Tipo = 'exito' | 'error' | 'info';
const Ctx = createContext<(texto: string, tipo?: Tipo) => void>(() => undefined);

/** Aviso flotante que entra desde arriba y se va solo. */
export function AvisoProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [aviso, setAviso] = useState<{ texto: string; tipo: Tipo } | null>(null);
  const y = useRef(new Animated.Value(-120)).current;
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avisar = useCallback(
    (texto: string, tipo: Tipo = 'info') => {
      if (tipo === 'exito') haptica.exito();
      if (tipo === 'error') haptica.error();
      setAviso({ texto, tipo });
      if (temporizador.current) clearTimeout(temporizador.current);
      Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
      temporizador.current = setTimeout(() => {
        Animated.timing(y, { toValue: -120, duration: 220, useNativeDriver: true }).start(() => setAviso(null));
      }, 3200);
    },
    [y],
  );

  const icono = aviso?.tipo === 'exito' ? 'checkmark-circle' : aviso?.tipo === 'error' ? 'alert-circle' : 'information-circle';
  const tinta = aviso?.tipo === 'exito' ? color.acento : aviso?.tipo === 'error' ? color.peligro : color.info;

  return (
    <Ctx.Provider value={avisar}>
      {children}
      {aviso && (
        <Animated.View pointerEvents="none" style={[s.contenedor, { top: insets.top + espacio.s, transform: [{ translateY: y }] }]}>
          <View style={[s.aviso, sombra]} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Icono n={icono} tam={22} c={tinta} />
            <T v="cuerpoFuerte" style={{ flex: 1 }}>
              {aviso.texto}
            </T>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export const useAviso = () => useContext(Ctx);

const s = StyleSheet.create({
  contenedor: { position: 'absolute', left: espacio.l, right: espacio.l, alignItems: 'center', zIndex: 1000 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, width: '100%', maxWidth: 480, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie3, borderWidth: 1, borderColor: color.bordeFuerte },
});
