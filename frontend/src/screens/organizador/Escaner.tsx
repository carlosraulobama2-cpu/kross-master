import { useQuery } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, BotonIcono, Fila, Icono, T, type NombreIcono } from '../../components/base';
import { Campo } from '../../components/formulario';
import { api, mensajeDe } from '../../lib/api';
import { haptica } from '../../lib/haptica';
import type { Escaneo, ResultadoEscaneo } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

const ASPECTO: Record<ResultadoEscaneo, { fondo: string; icono: NombreIcono; titulo: string }> = {
  valida: { fondo: '#00C96B', icono: 'checkmark-circle', titulo: 'Adelante' },
  ya_usada: { fondo: '#E0A800', icono: 'alert-circle', titulo: 'Ya usada' },
  caducada: { fondo: '#E0A800', icono: 'time', titulo: 'QR caducado' },
  otro_evento: { fondo: '#E0A800', icono: 'swap-horizontal', titulo: 'Otro evento' },
  invalida: { fondo: '#E5384A', icono: 'close-circle', titulo: 'No válida' },
  anulada: { fondo: '#E5384A', icono: 'ban', titulo: 'Anulada' },
};

export function EscanerScreen({ navigation, route }: PropsPantalla<'Escaner'>) {
  useKeepAwake();
  const { eventoId, titulo } = route.params;
  const insets = useSafeAreaInsets();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [resultado, setResultado] = useState<Escaneo | null>(null);
  const [manual, setManual] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [linterna, setLinterna] = useState(false);
  const procesando = useRef(false);
  const ultimo = useRef<{ valor: string; t: number } | null>(null);
  const aparicion = useRef(new Animated.Value(0)).current;

  const resumen = useQuery({
    queryKey: ['yo', 'puerta', eventoId, 'resumen'],
    queryFn: () => api<{ vendidas: number; validadas: number }>(`/puerta/eventos/${eventoId}/resumen`),
    refetchInterval: 10_000,
  });

  useEffect(() => {
    if (!resultado) return;
    Animated.spring(aparicion, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
    const t = setTimeout(cerrarResultado, resultado.valida ? 1600 : 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  function cerrarResultado() {
    Animated.timing(aparicion, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setResultado(null);
      procesando.current = false;
    });
  }

  async function validar(cuerpo: { token?: string; codigo?: string }) {
    if (procesando.current) return;
    procesando.current = true;
    try {
      const r = await api<Escaneo>('/puerta/validar', { method: 'POST', body: { eventoId, ...cuerpo } });
      if (r.valida) haptica.exito();
      else haptica.error();
      setResultado(r);
      void resumen.refetch();
    } catch (e) {
      haptica.error();
      setResultado({ resultado: 'invalida', valida: false, mensaje: mensajeDe(e), entrada: null });
    }
  }

  function alEscanear(valor: string) {
    // Ignora el mismo QR durante 3 s para no validarlo dos veces seguidas.
    const ahora = Date.now();
    if (ultimo.current && ultimo.current.valor === valor && ahora - ultimo.current.t < 3000) return;
    ultimo.current = { valor, t: ahora };
    void validar({ token: valor });
  }

  const aspecto = resultado ? ASPECTO[resultado.resultado] : null;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {permiso?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={linterna}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={resultado ? undefined : ({ data }) => alEscanear(data)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, s.sinPermiso]}>
          <Icono n="camera-outline" tam={48} c={color.texto2} />
          <T v="subtitulo" centro>
            Necesitamos la cámara
          </T>
          <T c="texto2" centro style={{ maxWidth: 300 }}>
            Para leer los QR de las entradas. También puedes escribir el código a mano.
          </T>
          {permiso?.canAskAgain !== false && (
            <Boton bloque={false} onPress={() => void pedirPermiso()}>
              Permitir cámara
            </Boton>
          )}
        </View>
      )}

      {/* Visor */}
      {permiso?.granted && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <View style={s.visor}>
            {(['tl', 'tr', 'bl', 'br'] as const).map((esq) => (
              <View key={esq} style={[s.esquina, s[esq]]} />
            ))}
          </View>
          <T v="cuerpoFuerte" style={{ marginTop: espacio.xl, color: '#fff' }}>
            Apunta al QR de la entrada
          </T>
        </View>
      )}

      {/* Barra superior */}
      <View style={[s.arriba, { paddingTop: insets.top + espacio.s }]}>
        <BotonIcono n="close" etiqueta="Salir del escáner" onPress={() => navigation.goBack()} fondo="rgba(0,0,0,0.5)" />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T v="cuerpoFuerte" numberOfLines={1} style={{ color: '#fff' }}>
            {titulo}
          </T>
          <T v="nota" style={{ color: 'rgba(255,255,255,0.75)', fontVariant: ['tabular-nums'] }}>
            {resumen.data ? `${resumen.data.validadas} / ${resumen.data.vendidas} dentro` : 'Cargando…'}
          </T>
        </View>
        <BotonIcono n={linterna ? 'flash' : 'flash-outline'} etiqueta="Linterna" onPress={() => setLinterna((v) => !v)} fondo="rgba(0,0,0,0.5)" />
      </View>

      {/* Barra inferior */}
      <View style={[s.abajo, { paddingBottom: insets.bottom + espacio.l }]}>
        <Boton v="secundario" icono="keypad-outline" onPress={() => setManual(true)}>
          Introducir código manual
        </Boton>
      </View>

      {/* Resultado a pantalla completa: se lee de un vistazo */}
      {resultado && aspecto && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: aparicion }]}>
          <Pressable style={[StyleSheet.absoluteFill, s.resultado, { backgroundColor: aspecto.fondo }]} onPress={cerrarResultado} accessibilityLiveRegion="assertive">
            <Animated.View style={{ transform: [{ scale: aparicion.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
              <Icono n={aspecto.icono} tam={120} c="#fff" />
            </Animated.View>
            <T v="display" centro style={{ color: '#fff' }}>
              {aspecto.titulo}
            </T>
            <T v="cabecera" centro style={{ color: 'rgba(255,255,255,0.9)' }}>
              {resultado.mensaje}
            </T>
            {resultado.entrada && (
              <View style={s.datosEntrada}>
                <T v="subtitulo" centro style={{ color: '#fff' }}>
                  {resultado.entrada.titular?.nombre || 'Asistente'}
                </T>
                <T v="cuerpoFuerte" centro style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {resultado.entrada.tramo.nombre} · {resultado.entrada.codigo}
                </T>
              </View>
            )}
            <T v="nota" style={{ color: 'rgba(255,255,255,0.7)', marginTop: espacio.xl }}>
              Toca para seguir escaneando
            </T>
          </Pressable>
        </Animated.View>
      )}

      <Modal visible={manual} transparent animationType="slide" onRequestClose={() => setManual(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={{ flex: 1, backgroundColor: color.velo }} onPress={() => setManual(false)} />
          <View style={[s.hoja, { paddingBottom: insets.bottom + espacio.l }]}>
            <T v="subtitulo">Código de la entrada</T>
            <Campo etiqueta="Código" value={codigo} onChangeText={(t) => setCodigo(t.toUpperCase())} placeholder="KM-XXXX-XXXX" autoCapitalize="characters" autoCorrect={false} autoFocus />
            <Fila gap={espacio.s}>
              <Boton v="secundario" onPress={() => setManual(false)} style={{ flex: 1 }}>
                Cancelar
              </Boton>
              <Boton
                style={{ flex: 1 }}
                deshabilitado={!/^KM-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(codigo.trim())}
                onPress={() => {
                  setManual(false);
                  void validar({ codigo: codigo.trim() });
                  setCodigo('');
                }}
              >
                Validar
              </Boton>
            </Fila>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const ESQ = 34;
const s = StyleSheet.create({
  sinPermiso: { alignItems: 'center', justifyContent: 'center', gap: espacio.m, padding: espacio.xxl, backgroundColor: color.fondo },
  visor: { width: 250, height: 250 },
  esquina: { position: 'absolute', width: ESQ, height: ESQ, borderColor: color.acento },
  tl: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 },
  arriba: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: espacio.m, paddingHorizontal: espacio.l, paddingBottom: espacio.m, backgroundColor: 'rgba(0,0,0,0.35)' },
  abajo: { position: 'absolute', left: espacio.xl, right: espacio.xl, bottom: 0 },
  resultado: { alignItems: 'center', justifyContent: 'center', gap: espacio.m, padding: espacio.xxl },
  datosEntrada: { marginTop: espacio.xl, paddingVertical: espacio.l, paddingHorizontal: espacio.xl, borderRadius: radio.xl, backgroundColor: 'rgba(0,0,0,0.18)', gap: 4 },
  hoja: { gap: espacio.l, padding: espacio.xl, borderTopLeftRadius: radio.xxl, borderTopRightRadius: radio.xxl, backgroundColor: color.superficie },
});
