import { Ionicons } from '@expo/vector-icons';
import { useRef, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { haptica } from '../lib/haptica';
import { color, espacio, radio, TACTIL, tipo, type VarianteTipo } from '../theme';

// ---------- Texto ----------

type ColorTexto = 'texto' | 'texto2' | 'texto3' | 'acento' | 'peligro' | 'aviso' | 'acentoTexto' | 'info';

export function T({ v = 'cuerpo', c = 'texto', centro, style, ...props }: TextProps & { v?: VarianteTipo; c?: ColorTexto; centro?: boolean }) {
  return <Text {...props} style={[tipo[v], { color: color[c] }, centro && { textAlign: 'center' }, style]} />;
}

// ---------- Icono ----------

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];

export const Icono = ({ n, tam = 20, c = color.texto }: { n: NombreIcono; tam?: number; c?: string }) => <Ionicons name={n} size={tam} color={c} />;

// ---------- Pulsable con escala ----------

/** Cualquier zona táctil: se encoge un poco al pulsar, como en iOS. */
export function Pulsable({
  children,
  style,
  escala = 0.97,
  onPress,
  sinHaptica,
  exterior,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  escala?: number;
  sinHaptica?: boolean;
  /** Estilo del contenedor táctil (p. ej. flex: 1 dentro de una fila). */
  exterior?: StyleProp<ViewStyle>;
}) {
  const valor = useRef(new Animated.Value(1)).current;
  // Las propiedades de layout respecto al padre deben ir en el Pressable, no en la vista interior.
  const plano = StyleSheet.flatten(style) ?? {};
  const layout: ViewStyle = {};
  const interior: ViewStyle = { ...plano };
  for (const k of ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf'] as const) {
    if (plano[k] !== undefined) (layout as Record<string, unknown>)[k] = plano[k];
    delete interior[k];
  }
  const animar = (a: number) => Animated.spring(valor, { toValue: a, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      {...props}
      style={[layout, exterior]}
      onPressIn={(e) => {
        animar(escala);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animar(1);
        props.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (!sinHaptica) haptica.toque();
        onPress?.(e);
      }}
      accessibilityRole={props.accessibilityRole ?? 'button'}
    >
      <Animated.View style={[interior, { transform: [{ scale: valor }] }, props.disabled && { opacity: 0.45 }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------- Botón ----------

type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro';

export function Boton({
  children,
  onPress,
  v = 'primario',
  icono,
  cargando,
  deshabilitado,
  pequeno,
  bloque = true,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  v?: VarianteBoton;
  icono?: NombreIcono;
  cargando?: boolean;
  deshabilitado?: boolean;
  pequeno?: boolean;
  bloque?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fondo = { primario: color.acento, secundario: color.superficie2, fantasma: 'transparent', peligro: color.peligroSuave }[v];
  const tinta = { primario: color.acentoTexto, secundario: color.texto, fantasma: color.texto2, peligro: color.peligro }[v];
  return (
    <Pulsable
      onPress={cargando ? undefined : onPress}
      disabled={deshabilitado}
      accessibilityState={{ disabled: deshabilitado, busy: cargando }}
      style={[
        s.boton,
        { backgroundColor: fondo, minHeight: pequeno ? 38 : 54, paddingHorizontal: pequeno ? espacio.l : espacio.xl },
        bloque ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' },
        style,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={tinta} />
      ) : (
        <>
          {icono && <Icono n={icono} tam={pequeno ? 16 : 20} c={tinta} />}
          <Text style={[pequeno ? tipo.nota : tipo.cuerpoFuerte, { color: tinta, fontWeight: '700' }]}>{children}</Text>
        </>
      )}
    </Pulsable>
  );
}

/** Botón redondo solo con icono (atrás, compartir, favorito…). */
export function BotonIcono({ n, onPress, etiqueta, c = color.texto, fondo = color.superficie2, tam = 20 }: { n: NombreIcono; onPress: () => void; etiqueta: string; c?: string; fondo?: string; tam?: number }) {
  return (
    <Pulsable onPress={onPress} accessibilityLabel={etiqueta} hitSlop={6} style={[s.botonIcono, { backgroundColor: fondo }]}>
      <Icono n={n} tam={tam} c={c} />
    </Pulsable>
  );
}

// ---------- Chip ----------

export function Chip({ texto, activo, onPress, icono }: { texto: string; activo?: boolean; onPress: () => void; icono?: NombreIcono }) {
  return (
    <Pulsable
      onPress={onPress}
      accessibilityState={{ selected: activo }}
      style={[s.chip, activo ? { backgroundColor: color.texto, borderColor: color.texto } : { backgroundColor: color.superficie, borderColor: color.borde }]}
    >
      {icono && <Icono n={icono} tam={15} c={activo ? color.fondo : color.texto2} />}
      <Text style={[tipo.nota, { color: activo ? color.fondo : color.texto, fontWeight: '600' }]}>{texto}</Text>
    </Pulsable>
  );
}

// ---------- Insignia ----------

type Tono = 'acento' | 'peligro' | 'aviso' | 'info' | 'neutro';

export function Insignia({ texto, tono = 'neutro', icono }: { texto: string; tono?: Tono; icono?: NombreIcono }) {
  const paleta = {
    acento: [color.acentoSuave, color.acento],
    peligro: [color.peligroSuave, color.peligro],
    aviso: [color.avisoSuave, color.aviso],
    info: [color.infoSuave, color.info],
    neutro: [color.superficie2, color.texto2],
  }[tono];
  return (
    <View style={[s.insignia, { backgroundColor: paleta[0] }]}>
      {icono && <Icono n={icono} tam={12} c={paleta[1]} />}
      <Text style={[tipo.mini, { color: paleta[1], letterSpacing: 0.4 }]}>{texto}</Text>
    </View>
  );
}

export const Separador = ({ m = espacio.l }: { m?: number }) => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color.borde, marginVertical: m }} />;

export const Fila = ({ children, gap = espacio.s, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);

const s = StyleSheet.create({
  boton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espacio.s, borderRadius: radio.l },
  botonIcono: { width: TACTIL, height: TACTIL, borderRadius: TACTIL / 2, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: radio.total, borderWidth: 1 },
  insignia: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radio.s },
});
