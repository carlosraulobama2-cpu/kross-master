import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Fila, Icono, T } from '../../components/base';
import { Cabecera } from '../../components/pantalla';
import { useCola } from '../../lib/consultas';
import { hora } from '../../lib/formato';
import { haptica } from '../../lib/haptica';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

/** Sala de espera de la cola virtual: se actualiza sola cada 5 s. */
export function ColaScreen({ navigation, route }: PropsPantalla<'Cola'>) {
  const { eventoId, titulo } = route.params;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data: cola } = useCola(eventoId, true);
  const pulso = useRef(new Animated.Value(0)).current;
  const avisado = useRef(false);

  useEffect(() => {
    const bucle = Animated.loop(Animated.timing(pulso, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    bucle.start();
    return () => bucle.stop();
  }, [pulso]);

  useEffect(() => {
    if (cola?.admitido && !avisado.current) {
      avisado.current = true;
      haptica.exito();
      void qc.invalidateQueries({ queryKey: ['evento', eventoId] });
    }
  }, [cola?.admitido, qc, eventoId]);

  const admitido = Boolean(cola?.admitido);

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <Cabecera titulo="Sala de espera" />
      <View style={s.centro}>
        <View style={s.anillo}>
          {!admitido && (
            <Animated.View
              style={[
                s.onda,
                { opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] },
              ]}
            />
          )}
          <View style={[s.circulo, admitido && { backgroundColor: color.acento }]}>
            {admitido ? (
              <Icono n="checkmark" tam={64} c={color.acentoTexto} />
            ) : (
              <>
                <T v="display" style={{ fontSize: 44, lineHeight: 50 }} accessibilityLabel={`${cola?.por_delante ?? 0} personas delante`}>
                  {cola?.por_delante ?? '…'}
                </T>
                <T v="nota" c="texto2">
                  delante de ti
                </T>
              </>
            )}
          </View>
        </View>

        <T v="titulo" centro style={{ marginTop: espacio.xxl }}>
          {admitido ? '¡Es tu turno!' : 'Estás en la cola'}
        </T>
        <T c="texto2" centro style={{ maxWidth: 320 }}>
          {admitido
            ? `Tienes hasta las ${cola?.expira_en ? hora(cola.expira_en) : '—'} para comprar tus entradas de ${titulo}.`
            : `Hay mucha gente queriendo entradas para ${titulo}. Te daremos paso por orden de llegada: espera aproximada ${cola?.minutos_estimados ?? 1} min.`}
        </T>

        {!admitido && (
          <View style={s.consejos}>
            {[
              ['phone-portrait-outline', 'Puedes salir de esta pantalla: guardamos tu puesto'],
              ['refresh-outline', 'No hace falta recargar, se actualiza sola'],
              ['notifications-outline', 'Entrar varias veces no te adelanta'],
            ].map(([icono, texto]) => (
              <Fila key={texto} gap={espacio.m}>
                <Icono n={icono as 'refresh-outline'} tam={18} c={color.texto3} />
                <T v="nota" c="texto2" style={{ flex: 1 }}>
                  {texto}
                </T>
              </Fila>
            ))}
          </View>
        )}
      </View>
      <View style={{ padding: espacio.xl, paddingBottom: insets.bottom + espacio.l }}>
        <Boton icono={admitido ? 'ticket' : 'arrow-back'} v={admitido ? 'primario' : 'secundario'} onPress={() => navigation.goBack()}>
          {admitido ? 'Elegir mis entradas' : 'Volver al evento'}
        </Boton>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.m, paddingHorizontal: espacio.xl },
  anillo: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  onda: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: color.acento },
  circulo: { width: 170, height: 170, borderRadius: 85, backgroundColor: color.superficie2, borderWidth: 2, borderColor: color.acento, alignItems: 'center', justifyContent: 'center' },
  consejos: { gap: espacio.m, marginTop: espacio.xxl, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, alignSelf: 'stretch', maxWidth: 420 },
});
