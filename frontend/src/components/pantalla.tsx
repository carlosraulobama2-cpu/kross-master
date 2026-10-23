import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, espacio } from '../theme';
import { BotonIcono, T } from './base';

/** Cabecera estándar: atrás, título y acciones a la derecha. */
export function Cabecera({ titulo, derecha, sinAtras, cerrar }: { titulo?: string; derecha?: ReactNode; sinAtras?: boolean; cerrar?: boolean }) {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.cabecera, { paddingTop: insets.top + espacio.s }]}>
      <View style={s.lado}>
        {!sinAtras && nav.canGoBack() && (
          <BotonIcono n={cerrar ? 'close' : 'chevron-back'} etiqueta={cerrar ? 'Cerrar' : 'Atrás'} onPress={() => nav.goBack()} />
        )}
      </View>
      {titulo ? (
        <T v="cabecera" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {titulo}
        </T>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={[s.lado, { alignItems: 'flex-end' }]}>{derecha}</View>
    </View>
  );
}

/** Pantalla con scroll, márgenes seguros y tirar-para-recargar opcional. */
export function Pantalla({
  children,
  cabecera,
  recargar,
  recargando = false,
  pie,
  sinPadding,
  ...props
}: ScrollViewProps & { cabecera?: ReactNode; recargar?: () => void; recargando?: boolean; pie?: ReactNode; sinPadding?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={s.raiz}>
      {cabecera}
      <ScrollView
        {...props}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          !sinPadding && { paddingHorizontal: espacio.xl },
          { paddingTop: cabecera ? espacio.s : insets.top + espacio.l, paddingBottom: (pie ? 120 : espacio.xxxl) + insets.bottom },
          props.contentContainerStyle,
        ]}
        refreshControl={recargar ? <RefreshControl refreshing={recargando} onRefresh={recargar} tintColor={color.acento} colors={[color.acento]} /> : undefined}
      >
        {children}
      </ScrollView>
      {pie && <BarraInferior>{pie}</BarraInferior>}
    </View>
  );
}

/** Barra fija abajo para la acción principal (comprar, pagar…). */
export function BarraInferior({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.barra, { paddingBottom: Math.max(insets.bottom, espacio.l) }]}>{children}</View>;
}

export function TituloSeccion({ titulo, accion }: { titulo: string; accion?: ReactNode }) {
  return (
    <View style={s.seccion}>
      <T v="subtitulo">{titulo}</T>
      {accion}
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, paddingHorizontal: espacio.l, paddingBottom: espacio.s, backgroundColor: color.fondo },
  lado: { width: 88, flexDirection: 'row', gap: espacio.s },
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: espacio.xl, paddingTop: espacio.l, backgroundColor: color.fondo, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borde },
  seccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: espacio.xxl, marginBottom: espacio.m },
});
