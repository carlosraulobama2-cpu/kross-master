import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import { Animated, Linking, Platform, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAviso } from '../../components/aviso';
import { Boton, BotonIcono, Fila, Icono, Insignia, Pulsable, Separador, T, type NombreIcono } from '../../components/base';
import { ErrorEstado, Esqueleto } from '../../components/estados';
import { ImagenEvento } from '../../components/evento';
import { Contador } from '../../components/formulario';
import { BarraInferior, Cabecera } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useConfig, useEvento, useFavorito } from '../../lib/consultas';
import { cuentaAtras, fechaLarga, hora, plural, precio, precioExacto } from '../../lib/formato';
import { haptica } from '../../lib/haptica';
import type { Pedido, Tramo } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { CATEGORIAS, color, espacio, radio } from '../../theme';

export function EventoScreen({ navigation, route }: PropsPantalla<'Evento'>) {
  const { id } = route.params;
  const { data: evento, error, refetch, isPending } = useEvento(id);
  const { data: config } = useConfig();
  const { usuario } = useAuth();
  const favorito = useFavorito(id);
  const avisar = useAviso();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const altoImagen = Math.min(width, 520) * 0.95;
  const scrollY = useRef(new Animated.Value(0)).current;
  const scroll = useRef<ScrollView>(null);
  const yEntradas = useRef(0);

  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [comprando, setComprando] = useState(false);
  const [descripcionCompleta, setDescripcionCompleta] = useState(false);

  const seleccion = useMemo(() => Object.entries(cantidades).filter(([, n]) => n > 0), [cantidades]);
  const nEntradas = seleccion.reduce((a, [, n]) => a + n, 0);
  const subtotal = seleccion.reduce((a, [tid, n]) => a + n * (evento?.tramos.find((t) => t.id === tid)?.precio_centimos ?? 0), 0);
  // Estimación en cliente; el importe real lo calcula siempre el servidor.
  const gastos =
    subtotal > 0 && config ? Math.round((subtotal * Number(config.gastos_gestion_porcentaje)) / 100) + config.gastos_gestion_fijo_centimos * nEntradas : 0;

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: color.fondo }}>
        <Cabecera />
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      </View>
    );
  }

  async function comprar() {
    if (!usuario) {
      navigation.navigate('Acceso');
      return;
    }
    setComprando(true);
    try {
      const r = await api<{ pedido: Pedido; clientSecret: string | null }>('/pedidos', {
        method: 'POST',
        body: { eventoId: id, items: seleccion.map(([tramoId, cantidad]) => ({ tramoId, cantidad })) },
      });
      setCantidades({});
      haptica.exito();
      if (r.pedido.estado === 'pagado') navigation.navigate('Confirmacion', { pedidoId: r.pedido.id });
      else navigation.navigate('Pago', { pedidoId: r.pedido.id, clientSecret: r.clientSecret });
    } catch (e) {
      avisar(mensajeDe(e), 'error');
      void refetch();
    } finally {
      setComprando(false);
    }
  }

  const compartir = () =>
    evento &&
    Share.share({
      message: `${evento.titulo} · ${fechaLarga(evento.inicia_en)} en ${evento.recinto}. Consigue tus entradas: https://kroosmaster.app/evento/${evento.id}`,
    }).catch(() => undefined);

  const abrirMapa = () => {
    if (!evento) return;
    const destino = encodeURIComponent(`${evento.recinto}, ${evento.direccion ?? ''} ${evento.ciudad}`);
    void Linking.openURL(Platform.OS === 'ios' ? `maps:0,0?q=${destino}` : `https://www.google.com/maps/search/?api=1&query=${destino}`);
  };

  const opacidadCabecera = scrollY.interpolate({ inputRange: [altoImagen - 140, altoImagen - 60], outputRange: [0, 1], extrapolate: 'clamp' });
  const escalaImagen = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.5, 1], extrapolateRight: 'clamp' });
  const desplazamientoImagen = scrollY.interpolate({ inputRange: [-200, 0, altoImagen], outputRange: [-100, 0, altoImagen * 0.4] });

  const categoria = CATEGORIAS.find((c) => c.id === evento?.categoria);
  const aLaVenta = evento?.tramos.some((t) => t.estado === 'a_la_venta');

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <Animated.ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
      >
        {/* Imagen con efecto parallax */}
        <Animated.View style={{ height: altoImagen, transform: [{ translateY: desplazamientoImagen }, { scale: escalaImagen }] }}>
          {evento ? (
            <ImagenEvento uri={evento.imagen_url} categoria={evento.categoria} style={StyleSheet.absoluteFill} r={0} />
          ) : (
            <Esqueleto ancho="100%" alto="100%" r={0} />
          )}
          <LinearGradient colors={['rgba(11,11,16,0.6)', 'transparent', 'transparent', color.fondo]} locations={[0, 0.25, 0.6, 1]} style={StyleSheet.absoluteFill} />
        </Animated.View>

        <View style={[s.cuerpo, { marginTop: -espacio.enorme }]}>
          {isPending || !evento ? (
            <View style={{ gap: espacio.m }}>
              <Esqueleto ancho={110} alto={22} />
              <Esqueleto ancho="90%" alto={34} />
              <Esqueleto ancho="60%" alto={34} />
              <Esqueleto alto={140} r={radio.l} style={{ marginTop: espacio.l }} />
            </View>
          ) : (
            <>
              <Fila gap={espacio.s} style={{ flexWrap: 'wrap' }}>
                {categoria && <Insignia texto={categoria.nombre} tono="acento" icono={categoria.icono} />}
                {cuentaAtras(evento.inicia_en) && <Insignia texto={cuentaAtras(evento.inicia_en)!} />}
                {evento.edad_minima ? <Insignia texto={`+${evento.edad_minima}`} tono="aviso" /> : null}
              </Fila>
              <T v="display" style={{ marginTop: espacio.m }} accessibilityRole="header">
                {evento.titulo}
              </T>
              <Fila gap={6} style={{ marginTop: espacio.s }}>
                <T c="texto2">por</T>
                <T v="cuerpoFuerte">{evento.organizador_nombre}</T>
                {evento.valoracion.total > 0 && (
                  <>
                    <T c="texto3"> · </T>
                    <Icono n="star" tam={14} c={color.aviso} />
                    <T v="cuerpoFuerte">{evento.valoracion.media!.toFixed(1)}</T>
                    <T c="texto3">({evento.valoracion.total})</T>
                  </>
                )}
              </Fila>

              {/* Datos clave */}
              <View style={s.tarjeta}>
                <Dato icono="calendar" titulo={fechaLarga(evento.inicia_en)} texto={`${hora(evento.inicia_en)}${evento.termina_en ? ` – ${hora(evento.termina_en)}` : ''}`} />
                <Separador m={0} />
                <Dato icono="location" titulo={evento.recinto} texto={[evento.direccion, evento.ciudad].filter(Boolean).join(', ')} onPress={abrirMapa} accion="Mapa" />
              </View>

              {/* Descripción */}
              {evento.descripcion ? (
                <View style={{ marginTop: espacio.xxl, gap: espacio.s }}>
                  <T v="subtitulo">Sobre el evento</T>
                  <T c="texto2" numberOfLines={descripcionCompleta ? undefined : 4}>
                    {evento.descripcion}
                  </T>
                  {evento.descripcion.length > 180 && (
                    <Pulsable onPress={() => setDescripcionCompleta((v) => !v)} style={{ alignSelf: 'flex-start' }}>
                      <T v="cuerpoFuerte" c="acento">
                        {descripcionCompleta ? 'Ver menos' : 'Leer más'}
                      </T>
                    </Pulsable>
                  )}
                </View>
              ) : null}

              {/* Entradas */}
              <View style={{ marginTop: espacio.xxl, gap: espacio.m }} onLayout={(e) => (yEntradas.current = e.nativeEvent.layout.y)}>
                <T v="subtitulo">Entradas</T>
                {evento.tramos.length === 0 && <T c="texto2">Las entradas aún no están disponibles.</T>}
                {evento.tramos.map((t) => (
                  <FilaTramo
                    key={t.id}
                    tramo={t}
                    cantidad={cantidades[t.id] ?? 0}
                    onCambio={(n) => {
                      haptica.toque();
                      setCantidades((c) => ({ ...c, [t.id]: n }));
                    }}
                  />
                ))}
              </View>

              <View style={[s.tarjeta, { flexDirection: 'row', gap: espacio.m, padding: espacio.l }]}>
                <Icono n="shield-checkmark" c={color.acento} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="cuerpoFuerte">Compra protegida</T>
                  <T v="nota" c="texto2">
                    {evento.politica_devolucion} Tu entrada lleva un QR que cambia cada 30 segundos: las capturas no sirven.
                  </T>
                </View>
              </View>
            </>
          )}
        </View>
      </Animated.ScrollView>

      {/* Cabecera flotante que aparece al hacer scroll */}
      <Animated.View pointerEvents="none" style={[s.cabeceraFondo, { height: insets.top + 64, opacity: opacidadCabecera }]} />
      <View style={[s.cabeceraFlotante, { top: insets.top + espacio.s }]}>
        <BotonIcono n="chevron-back" etiqueta="Atrás" onPress={() => navigation.goBack()} fondo="rgba(11,11,16,0.6)" />
        <Animated.View style={{ flex: 1, opacity: opacidadCabecera, paddingHorizontal: espacio.s }}>
          <T v="cabecera" numberOfLines={1} centro>
            {evento?.titulo}
          </T>
        </Animated.View>
        <Fila>
          <BotonIcono n="share-outline" etiqueta="Compartir" onPress={() => void compartir()} fondo="rgba(11,11,16,0.6)" />
          <BotonIcono
            n={evento?.favorito ? 'heart' : 'heart-outline'}
            c={evento?.favorito ? color.peligro : color.texto}
            etiqueta={evento?.favorito ? 'Quitar de favoritos' : 'Guardar en favoritos'}
            fondo="rgba(11,11,16,0.6)"
            onPress={() => {
              if (!usuario) return navigation.navigate('Acceso');
              haptica.impacto();
              favorito.mutate(!evento?.favorito);
            }}
          />
        </Fila>
      </View>

      {evento && (
        <BarraInferior>
          {nEntradas > 0 ? (
            <Fila gap={espacio.l}>
              <View style={{ flex: 1 }}>
                <T v="nota" c="texto2">
                  {plural(nEntradas, 'entrada', 'entradas')}
                  {gastos > 0 ? ` + ${precioExacto(gastos)} gestión` : ''}
                </T>
                <T v="subtitulo">{subtotal === 0 ? 'Gratis' : precioExacto(subtotal + gastos)}</T>
              </View>
              <Boton onPress={() => void comprar()} cargando={comprando} bloque={false} icono="arrow-forward" style={{ minWidth: 160 }}>
                {subtotal === 0 ? 'Reservar' : 'Continuar'}
              </Boton>
            </Fila>
          ) : (
            <Fila gap={espacio.l}>
              <View style={{ flex: 1 }}>
                <T v="nota" c="texto2">
                  {aLaVenta ? 'Desde' : 'Estado'}
                </T>
                <T v="subtitulo">{aLaVenta ? precio(evento.precio_desde_centimos) : 'Agotado'}</T>
              </View>
              {aLaVenta ? (
                <Boton
                  bloque={false}
                  icono="ticket"
                  style={{ minWidth: 160 }}
                  onPress={() => scroll.current?.scrollTo({ y: altoImagen - espacio.enorme + yEntradas.current - 80, animated: true })}
                >
                  Elegir entradas
                </Boton>
              ) : (
                <T v="nota" c="texto2" style={{ flex: 1.3, textAlign: 'right' }}>
                  Guárdalo en favoritos por si se liberan entradas
                </T>
              )}
            </Fila>
          )}
        </BarraInferior>
      )}
    </View>
  );
}

function Dato({ icono, titulo, texto, onPress, accion }: { icono: NombreIcono; titulo: string; texto: string; onPress?: () => void; accion?: string }) {
  const contenido = (
    <Fila gap={espacio.m} style={{ padding: espacio.l }}>
      <View style={s.datoIcono}>
        <Icono n={icono} tam={20} c={color.acento} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="cuerpoFuerte">{titulo}</T>
        {texto ? (
          <T v="nota" c="texto2">
            {texto}
          </T>
        ) : null}
      </View>
      {accion && (
        <T v="nota" c="acento" style={{ fontWeight: '700' }}>
          {accion}
        </T>
      )}
    </Fila>
  );
  return onPress ? (
    <Pulsable onPress={onPress} escala={0.99} accessibilityLabel={`${titulo}. ${accion ?? ''}`}>
      {contenido}
    </Pulsable>
  ) : (
    contenido
  );
}

function FilaTramo({ tramo, cantidad, onCambio }: { tramo: Tramo; cantidad: number; onCambio: (n: number) => void }) {
  const disponible = tramo.estado === 'a_la_venta';
  const max = Math.min(tramo.max_por_pedido, tramo.disponibles);
  const pocas = disponible && tramo.disponibles <= 20;
  return (
    <View style={[s.tramo, cantidad > 0 && { borderColor: color.acento, backgroundColor: 'rgba(0,255,135,0.05)' }, !disponible && { opacity: 0.6 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="cuerpoFuerte" style={{ fontWeight: '700' }}>
          {tramo.nombre}
        </T>
        {tramo.descripcion ? (
          <T v="nota" c="texto2">
            {tramo.descripcion}
          </T>
        ) : null}
        <Fila gap={espacio.s} style={{ marginTop: 4 }}>
          <T v="cabecera">{precio(tramo.precio_centimos)}</T>
          {tramo.estado === 'agotado' && <Insignia texto="Agotado" tono="peligro" />}
          {tramo.estado === 'proximamente' && <Insignia texto="Próximamente" tono="info" />}
          {tramo.estado === 'finalizado' && <Insignia texto="Venta cerrada" />}
          {pocas && <Insignia texto={`Quedan ${tramo.disponibles}`} tono="aviso" />}
        </Fila>
      </View>
      {disponible && <Contador valor={cantidad} max={max} onCambio={onCambio} />}
    </View>
  );
}

const s = StyleSheet.create({
  cuerpo: { paddingHorizontal: espacio.xl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  tarjeta: { marginTop: espacio.xl, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde, overflow: 'hidden' },
  datoIcono: { width: 40, height: 40, borderRadius: radio.m, backgroundColor: color.acentoSuave, alignItems: 'center', justifyContent: 'center' },
  tramo: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, padding: espacio.l, borderRadius: radio.l, borderWidth: 1.5, borderColor: color.borde, backgroundColor: color.superficie },
  cabeceraFondo: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: color.fondo, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.borde },
  cabeceraFlotante: { position: 'absolute', left: espacio.l, right: espacio.l, flexDirection: 'row', alignItems: 'center' },
});
