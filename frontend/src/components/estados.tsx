import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { mensajeDe } from '../lib/api';
import { color, espacio, radio } from '../theme';
import { Boton, Icono, T, type NombreIcono } from './base';
import { traducir as tx } from '../lib/i18n';

/** Bloque gris con pulso suave mientras carga. */
export function Esqueleto({ ancho = '100%', alto = 16, r = radio.s, style }: { ancho?: DimensionValue; alto?: DimensionValue; r?: number; style?: StyleProp<ViewStyle> }) {
  const opacidad = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidad, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacidad, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    bucle.start();
    return () => bucle.stop();
  }, [opacidad]);
  return <Animated.View style={[{ width: ancho, height: alto, borderRadius: r, backgroundColor: color.superficie2, opacity: opacidad }, style]} />;
}

export function Vacio({ icono, titulo, texto, accion }: { icono: NombreIcono; titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <View style={s.vacio}>
      <View style={s.vacioIcono}>
        <Icono n={icono} tam={30} c={color.texto2} />
      </View>
      <T v="subtitulo" centro>
        {titulo}
      </T>
      {texto && (
        <T c="texto2" centro style={{ maxWidth: 300 }}>
          {texto}
        </T>
      )}
      {accion && <View style={{ marginTop: espacio.s, alignSelf: 'stretch', alignItems: 'center' }}>{accion}</View>}
    </View>
  );
}

export function ErrorEstado({ error, reintentar }: { error: unknown; reintentar: () => void }) {
  return (
    <Vacio
      icono="cloud-offline-outline"
      titulo={tx('No hemos podido cargar esto')}
      texto={mensajeDe(error)}
      accion={
        <Boton v="secundario" icono="refresh" onPress={reintentar} bloque={false}>
          {tx('Reintentar')}
        </Boton>
      }
    />
  );
}

const s = StyleSheet.create({
  vacio: { alignItems: 'center', gap: espacio.s, paddingVertical: espacio.enorme, paddingHorizontal: espacio.xxl },
  vacioIcono: { width: 72, height: 72, borderRadius: 24, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde, alignItems: 'center', justifyContent: 'center', marginBottom: espacio.s },
});
