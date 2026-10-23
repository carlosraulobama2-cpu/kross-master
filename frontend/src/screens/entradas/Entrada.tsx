import { useFocusEffect } from '@react-navigation/native';
import * as Brightness from 'expo-brightness';
import { useKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Linking, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Boton, Fila, Icono, Pulsable, T } from '../../components/base';
import { ErrorEstado, Esqueleto } from '../../components/estados';
import { ImagenEvento } from '../../components/evento';
import { Cabecera } from '../../components/pantalla';
import { useEntradas } from '../../lib/consultas';
import { fechaLarga, hora } from '../../lib/formato';
import { PERIODO_QR, segundosParaRotar, tokenQr } from '../../lib/qr';
import type { Entrada } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

/** Sube el brillo al máximo mientras se enseña el QR y lo restaura al salir. */
function useBrilloMaximo() {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web') return undefined;
      let previo: number | null = null;
      Brightness.getBrightnessAsync()
        .then((b) => {
          previo = b;
          return Brightness.setBrightnessAsync(1);
        })
        .catch(() => undefined);
      return () => {
        if (previo !== null) void Brightness.setBrightnessAsync(previo).catch(() => undefined);
      };
    }, []),
  );
}

/** Token del QR que se regenera cada 30 s, sin conexión. */
function useTokenRotativo(semilla: string | null, entradaId: string) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ventana = Math.floor(ahora / 1000 / PERIODO_QR);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const token = useMemo(() => (semilla ? tokenQr(semilla, entradaId, ahora) : null), [semilla, entradaId, ventana]);
  return { token, restantes: segundosParaRotar(ahora) };
}

const MENSAJE_ESTADO: Record<Exclude<Entrada['estado'], 'valida'>, { icono: 'checkmark-done' | 'close-circle' | 'return-down-back'; texto: string }> = {
  usada: { icono: 'checkmark-done', texto: 'Entrada usada' },
  anulada: { icono: 'close-circle', texto: 'Entrada anulada' },
  reembolsada: { icono: 'return-down-back', texto: 'Entrada reembolsada' },
};

function TarjetaQr({ entrada, ancho, onTransferir }: { entrada: Entrada; ancho: number; onTransferir: () => void }) {
  const { token, restantes } = useTokenRotativo(entrada.qr_semilla, entrada.id);
  const [verCodigo, setVerCodigo] = useState(false);
  const progreso = useRef(new Animated.Value(restantes / PERIODO_QR)).current;

  useEffect(() => {
    progreso.setValue(restantes / PERIODO_QR);
    Animated.timing(progreso, { toValue: (restantes - 1) / PERIODO_QR, duration: 1000, easing: Easing.linear, useNativeDriver: false }).start();
  }, [restantes, progreso]);

  const tamQr = Math.min(ancho - 96, 260);
  const valida = entrada.estado === 'valida';

  return (
    <View style={[s.tarjeta, { width: ancho - espacio.xl * 2 }]}>
      <Fila gap={espacio.m}>
        <ImagenEvento uri={entrada.evento.imagen_url} categoria={entrada.evento.categoria} style={{ width: 56, height: 56 }} r={radio.m} />
        <View style={{ flex: 1 }}>
          <T v="cabecera" numberOfLines={2}>
            {entrada.evento.titulo}
          </T>
          <T v="nota" c="texto2">
            {entrada.tramo.nombre}
          </T>
        </View>
      </Fila>

      <View style={[s.qrCaja, { width: tamQr + 32, height: tamQr + 32 }]} accessibilityLabel="Código QR de la entrada. Enséñalo en la puerta.">
        {token && valida ? (
          <QRCode value={token} size={tamQr} backgroundColor="#FFFFFF" color="#0B0B10" ecl="M" />
        ) : (
          <View style={[s.qrEstado, { width: tamQr, height: tamQr }]}>
            <Icono n={valida ? 'cloud-offline' : MENSAJE_ESTADO[entrada.estado as keyof typeof MENSAJE_ESTADO].icono} tam={48} c="#6B6B80" />
            <T v="cabecera" style={{ color: '#0B0B10' }} centro>
              {valida ? 'QR no disponible' : MENSAJE_ESTADO[entrada.estado as keyof typeof MENSAJE_ESTADO].texto}
            </T>
            {entrada.usada_en && (
              <T v="nota" style={{ color: '#55556A' }}>
                {fechaLarga(entrada.usada_en)} · {hora(entrada.usada_en)}
              </T>
            )}
          </View>
        )}
      </View>

      {valida && (
        <View style={{ alignSelf: 'stretch', gap: 6 }}>
          <View style={s.barra}>
            <Animated.View style={[s.barraRelleno, { width: progreso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <Fila style={{ justifyContent: 'space-between' }}>
            <Fila gap={4}>
              <Icono n="shield-checkmark" tam={14} c={color.acento} />
              <T v="nota" c="texto2">
                QR dinámico · funciona sin conexión
              </T>
            </Fila>
            <T v="nota" c="texto3" style={{ fontVariant: ['tabular-nums'] }}>
              {restantes}s
            </T>
          </Fila>
        </View>
      )}

      <Pulsable onPress={() => setVerCodigo((v) => !v)} style={s.codigo} escala={0.98} accessibilityLabel={verCodigo ? 'Ocultar código' : 'Mostrar código manual'}>
        <T v="mini" c="texto3">
          Código manual
        </T>
        <T v="cabecera" style={{ letterSpacing: 2, fontVariant: ['tabular-nums'] }}>
          {verCodigo ? entrada.codigo : 'KM-••••-••••'}
        </T>
      </Pulsable>

      {valida &&
        (entrada.transferenciaPendiente ? (
          <Fila gap={6}>
            <Icono n="time-outline" tam={16} c={color.aviso} />
            <T v="nota" c="aviso">
              Transferencia pendiente de aceptar
            </T>
          </Fila>
        ) : (
          <Boton v="secundario" icono="paper-plane-outline" onPress={onTransferir}>
            Enviar a un amigo
          </Boton>
        ))}
    </View>
  );
}

export function EntradaScreen({ navigation, route }: PropsPantalla<'Entrada'>) {
  useKeepAwake();
  useBrilloMaximo();
  const { width } = useWindowDimensions();
  const ancho = Math.min(width, 520);
  const { data, error, refetch } = useEntradas();
  const [indice, setIndice] = useState(0);

  const actual = data?.find((e) => e.id === route.params.id);
  const delEvento = useMemo(
    () => (actual ? (data ?? []).filter((e) => e.evento.id === actual.evento.id).sort((a, b) => Number(b.estado === 'valida') - Number(a.estado === 'valida')) : []),
    [data, actual],
  );

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: color.fondo }}>
        <Cabecera titulo="Entrada" />
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      </View>
    );
  }

  const abrirMapa = () => {
    if (!actual) return;
    const destino = encodeURIComponent(`${actual.evento.recinto}, ${actual.evento.direccion ?? ''} ${actual.evento.ciudad}`);
    void Linking.openURL(Platform.OS === 'ios' ? `maps:0,0?q=${destino}` : `https://www.google.com/maps/search/?api=1&query=${destino}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <Cabecera titulo={delEvento.length > 1 ? `Entrada ${indice + 1} de ${delEvento.length}` : 'Tu entrada'} />
      {!actual ? (
        <View style={{ padding: espacio.xl }}>
          <Esqueleto alto={560} r={radio.xxl} />
        </View>
      ) : (
        <>
          <FlatList
            horizontal
            pagingEnabled
            data={delEvento}
            keyExtractor={(e) => e.id}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / ancho))}
            style={{ flexGrow: 0, alignSelf: 'center', width: ancho }}
            renderItem={({ item }) => (
              <View style={{ width: ancho, paddingHorizontal: espacio.xl, paddingTop: espacio.s }}>
                <TarjetaQr entrada={item} ancho={ancho} onTransferir={() => navigation.navigate('Transferir', { entradaId: item.id, titulo: item.evento.titulo })} />
              </View>
            )}
          />
          {delEvento.length > 1 && (
            <Fila gap={6} style={{ justifyContent: 'center', marginTop: espacio.l }}>
              {delEvento.map((e, i) => (
                <View key={e.id} style={[s.punto, i === indice && s.puntoActivo]} />
              ))}
            </Fila>
          )}
          <Pulsable onPress={abrirMapa} style={s.lugar} escala={0.98}>
            <Icono n="navigate" c={color.acento} />
            <View style={{ flex: 1 }}>
              <T v="cuerpoFuerte">
                {fechaLarga(actual.evento.inicia_en)} · {hora(actual.evento.inicia_en)}
              </T>
              <T v="nota" c="texto2">
                {actual.evento.recinto}, {actual.evento.ciudad}
              </T>
            </View>
            <Icono n="chevron-forward" c={color.texto3} />
          </Pulsable>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tarjeta: { alignItems: 'center', gap: espacio.l, padding: espacio.xl, borderRadius: radio.xxl, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  qrCaja: { alignItems: 'center', justifyContent: 'center', borderRadius: radio.xl, backgroundColor: '#FFFFFF' },
  qrEstado: { alignItems: 'center', justifyContent: 'center', gap: espacio.s },
  barra: { height: 4, borderRadius: 2, backgroundColor: color.superficie3, overflow: 'hidden' },
  barraRelleno: { height: '100%', backgroundColor: color.acento },
  codigo: { alignItems: 'center', gap: 2, paddingVertical: espacio.s, paddingHorizontal: espacio.l, borderRadius: radio.m, backgroundColor: color.superficie2, alignSelf: 'stretch' },
  punto: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.bordeFuerte },
  puntoActivo: { width: 18, backgroundColor: color.acento },
  lugar: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, margin: espacio.xl, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde, maxWidth: 480, alignSelf: 'center', width: '90%' },
});
