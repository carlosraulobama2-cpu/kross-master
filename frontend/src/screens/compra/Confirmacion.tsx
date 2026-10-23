import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Icono, T } from '../../components/base';
import { anadirAlCalendario } from '../../lib/calendario';
import { invalidarYo, usePedido } from '../../lib/consultas';
import { fechaLarga, hora, plural } from '../../lib/formato';
import { haptica } from '../../lib/haptica';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';
import { traducir as tx } from '../../lib/i18n';

export function ConfirmacionScreen({ navigation, route }: PropsPantalla<'Confirmacion'>) {
  const { pedidoId } = route.params;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: pedido } = usePedido(pedidoId, true);
  const pagado = pedido?.estado === 'pagado';
  const [lento, setLento] = useState(false);
  const escala = useRef(new Animated.Value(0)).current;
  const aparicion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => setLento(true), 15_000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!pagado) return;
    haptica.exito();
    void invalidarYo(qc);
    Animated.sequence([
      Animated.spring(escala, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 14 }),
      Animated.timing(aparicion, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [pagado, escala, aparicion, qc]);

  const entradas = pedido?.items.reduce((a, i) => a + i.cantidad, 0) ?? 0;

  return (
    <View style={[s.raiz, { paddingTop: insets.top + espacio.xxxl, paddingBottom: insets.bottom + espacio.xl }]}>
      <View style={s.centro}>
        {pagado ? (
          <>
            <Animated.View style={[s.check, { transform: [{ scale: escala }] }]}>
              <Icono n="checkmark" tam={56} c={color.acentoTexto} />
            </Animated.View>
            <Animated.View style={{ opacity: aparicion, alignItems: 'center', gap: espacio.s }}>
              <T v="display" centro>
                {tx('¡Ya tienes tus entradas!')}
              </T>
              <T c="texto2" centro style={{ maxWidth: 320 }}>
                {plural(entradas, 'entrada', 'entradas')} para {pedido.evento.titulo}. Te esperamos el {fechaLarga(pedido.evento.inicia_en).toLowerCase()} a las{' '}
                {hora(pedido.evento.inicia_en)}.
              </T>
            </Animated.View>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={color.acento} />
            <T v="titulo" centro>
              {tx('Confirmando tu pago…')}
            </T>
            <T c="texto2" centro style={{ maxWidth: 300 }}>
              {lento ? tx('Está tardando más de lo normal. No te preocupes: en cuanto se confirme verás tus entradas en la app.') : tx('Solo tardará unos segundos.')}
            </T>
          </>
        )}
      </View>
      <View style={{ gap: espacio.s, width: '100%', maxWidth: 480 }}>
        <Boton
          icono="ticket"
          deshabilitado={!pagado && !lento}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Pestanas', params: { screen: 'Entradas' } }] })}
        >
          {tx('Ver mis entradas')}
        </Boton>
        {pagado && (
          <Boton v="secundario" icono="calendar-outline" onPress={() => void anadirAlCalendario(pedido.evento.id)}>
            {tx('Añadir al calendario')}
          </Boton>
        )}
        <Boton v="fantasma" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Pestanas' }] })}>
          {tx('Seguir explorando')}
        </Boton>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.fondo, alignItems: 'center', paddingHorizontal: espacio.xl },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.l },
  check: { width: 112, height: 112, borderRadius: radio.total, backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center', marginBottom: espacio.l, shadowColor: color.acento, shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 0 } },
});
