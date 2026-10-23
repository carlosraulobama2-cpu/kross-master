import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, Share, StyleSheet, Switch, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAviso } from '../../components/aviso';
import { Boton, BotonIcono, Fila, Icono, Insignia, Pulsable, Separador, T, type NombreIcono } from '../../components/base';
import { ErrorEstado, Esqueleto } from '../../components/estados';
import { ImagenEvento } from '../../components/evento';
import { Contador } from '../../components/formulario';
import { describirButacas, PlanoAsientos, type Butaca } from '../../components/plano';
import { BarraInferior, Cabecera } from '../../components/pantalla';
import { api, ErrorApi, mensajeDe } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { anadirAlCalendario } from '../../lib/calendario';
import { useConfig, useEvento, useFavorito } from '../../lib/consultas';
import { cuentaAtras, fechaFrase, fechaLarga, hora, plural, precio, precioExacto } from '../../lib/formato';
import { haptica } from '../../lib/haptica';
import type { CodigoDescuento, EventoDetalle, Extra, Pedido, Tramo } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { CATEGORIAS, color, espacio, radio, tipo } from '../../theme';
import { traducir as tx } from '../../lib/i18n';

export function EventoScreen({ navigation, route }: PropsPantalla<'Evento'>) {
  const { id } = route.params;
  const [acceso, setAcceso] = useState<string | undefined>();
  const { data: evento, error, refetch, isPending, isFetching } = useEvento(id, acceso);
  const { data: config } = useConfig();
  const { usuario } = useAuth();
  const favorito = useFavorito(id);
  const qc = useQueryClient();
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
  const [codigo, setCodigo] = useState<CodigoDescuento | null>(null);
  const [esperando, setEsperando] = useState(false);
  const [reventa, setReventa] = useState<{ tramoId: string; cantidad: number } | null>(null);
  const [seguro, setSeguro] = useState(false);
  const [uniendose, setUniendose] = useState(false);
  const [butacas, setButacas] = useState<Record<string, Butaca[]>>({});
  const [extrasSel, setExtrasSel] = useState<Record<string, number>>({});

  const seleccion = useMemo(
    () => (reventa && reventa.cantidad > 0 ? [[reventa.tramoId, reventa.cantidad] as [string, number]] : Object.entries(cantidades).filter(([, n]) => n > 0)),
    [cantidades, reventa],
  );
  const nEntradas = seleccion.reduce((a, [, n]) => a + n, 0);
  const tramoDe = (tid: string) => evento?.tramos.find((t) => t.id === tid);
  const subtotal = seleccion.reduce((a, [tid, n]) => a + n * (tramoDe(tid)?.precio_centimos ?? 0), 0);

  // Estimación en cliente con la misma fórmula del servidor; el importe real lo calcula siempre la API.
  const aplicable = codigo
    ? seleccion.reduce((a, [tid, n]) => a + (!codigo.tramo_ids || codigo.tramo_ids.includes(tid) ? n * (tramoDe(tid)?.precio_centimos ?? 0) : 0), 0)
    : 0;
  const descuento = !codigo || aplicable === 0 ? 0 : codigo.tipo === 'porcentaje' ? Math.round((aplicable * codigo.valor) / 100) : Math.min(codigo.valor, aplicable);
  const base = subtotal - descuento;
  const gastos = base > 0 && config ? Math.round((base * Number(config.gastos_gestion_porcentaje)) / 100) + config.gastos_gestion_fijo_centimos * nEntradas : 0;
  const costeSeguro = base > 0 && config ? Math.round((base * Number(config.seguro_porcentaje)) / 100) : 0;
  const extrasElegidos = reventa ? [] : Object.entries(extrasSel).filter(([, n]) => n > 0);
  const nExtras = extrasElegidos.reduce((a, [, n]) => a + n, 0);
  const totalExtras = extrasElegidos.reduce((a, [xid, n]) => a + n * (evento?.extras.find((x) => x.id === xid)?.precio_centimos ?? 0), 0);
  const totalEstimado = base + gastos + (seguro ? costeSeguro : 0) + totalExtras;
  const conCola = Boolean(usuario && evento?.cola_activa);
  const turnoOk = !conCola || Boolean(evento?.cola?.admitido);

  if (error && !evento) {
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
      const r = reventa
        ? await api<{ pedido: Pedido; clientSecret: string | null }>('/pedidos/reventa', {
            method: 'POST',
            body: { eventoId: id, tramoId: reventa.tramoId, cantidad: reventa.cantidad, seguro },
          })
        : await api<{ pedido: Pedido; clientSecret: string | null }>('/pedidos', {
            method: 'POST',
            body: {
              eventoId: id,
              items: seleccion.map(([tramoId, cantidad]) => ({ tramoId, cantidad, ...(butacas[tramoId]?.length ? { asientos: butacas[tramoId].map((b) => b.id) } : {}) })),
              extras: extrasElegidos.map(([extraId, cantidad]) => ({ extraId, cantidad })),
              codigo: codigo?.codigo,
              codigoAcceso: acceso,
              seguro,
            },
          });
      setCantidades({});
      setButacas({});
      setExtrasSel({});
      setReventa(null);
      haptica.exito();
      if (r.pedido.estado === 'pagado') navigation.navigate('Confirmacion', { pedidoId: r.pedido.id });
      else navigation.navigate('Pago', { pedidoId: r.pedido.id, clientSecret: r.clientSecret });
    } catch (e) {
      avisar(mensajeDe(e), 'error');
      if (e instanceof ErrorApi && e.codigo === 'ASIENTO_OCUPADO') {
        setButacas({});
        setCantidades((c) => Object.fromEntries(Object.entries(c).filter(([tid]) => !tramoDe(tid)?.numerado)));
        void qc.invalidateQueries({ queryKey: ['asientos', id] });
      }
      void refetch();
    } finally {
      setComprando(false);
    }
  }

  async function alternarListaEspera() {
    if (!usuario) return navigation.navigate('Acceso');
    if (!evento) return;
    setEsperando(true);
    try {
      await api(`/eventos/${id}/lista-espera`, { method: evento.en_lista_espera ? 'DELETE' : 'PUT' });
      haptica.exito();
      avisar(evento.en_lista_espera ? tx('Te hemos quitado de la lista de espera') : tx('Te avisaremos en cuanto haya entradas'), 'exito');
      await qc.invalidateQueries({ queryKey: ['evento', id] });
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setEsperando(false);
    }
  }

  async function entrarEnCola() {
    if (!usuario) return navigation.navigate('Acceso');
    setUniendose(true);
    try {
      await api(`/eventos/${id}/cola`, { method: 'POST' });
      navigation.navigate('Cola', { eventoId: id, titulo: evento?.titulo ?? '' });
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setUniendose(false);
    }
  }

  async function inscribirseFan() {
    if (!usuario) return navigation.navigate('Acceso');
    try {
      await api(`/eventos/${id}/registro-fan`, { method: 'POST' });
      haptica.exito();
      avisar(tx('¡Inscrito! Te avisaremos del resultado del sorteo'), 'exito');
      await qc.invalidateQueries({ queryKey: ['evento', id] });
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    }
  }

  const compartir = () =>
    evento &&
    Share.share({
      message: `${evento.titulo} · ${fechaLarga(evento.inicia_en)} en ${evento.recinto}. Consigue tus entradas: https://kroosmaster.app/evento/${evento.id}`,
    }).catch(() => undefined);

  const opacidadCabecera = scrollY.interpolate({ inputRange: [altoImagen - 140, altoImagen - 60], outputRange: [0, 1], extrapolate: 'clamp' });
  const escalaImagen = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.5, 1], extrapolateRight: 'clamp' });
  const desplazamientoImagen = scrollY.interpolate({ inputRange: [-200, 0, altoImagen], outputRange: [-100, 0, altoImagen * 0.4] });

  const categoria = CATEGORIAS.find((c) => c.id === evento?.categoria);
  const aLaVenta = evento?.tramos.some((t) => t.estado === 'a_la_venta' || t.reventa_disponibles > 0);
  const irAEntradas = () => scroll.current?.scrollTo({ y: altoImagen - espacio.enorme + yEntradas.current - 80, animated: true });

  return (
    <View style={{ flex: 1, backgroundColor: color.fondo }}>
      <Animated.ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
      >
        {/* Imagen con efecto parallax */}
        <Animated.View style={{ height: altoImagen, transform: [{ translateY: desplazamientoImagen }, { scale: escalaImagen }] }}>
          {evento ? <ImagenEvento uri={evento.imagen_url} categoria={evento.categoria} style={StyleSheet.absoluteFill} r={0} /> : <Esqueleto ancho="100%" alto="100%" r={0} />}
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
                {categoria && <Insignia texto={tx(categoria.nombre)} tono="acento" icono={categoria.icono} />}
                {cuentaAtras(evento.inicia_en) && <Insignia texto={cuentaAtras(evento.inicia_en)!} />}
                {evento.edad_minima ? <Insignia texto={`+${evento.edad_minima}`} tono="aviso" /> : null}
                {evento.fecha_original ? <Insignia texto={tx('Aplazado')} tono="aviso" icono="calendar-outline" /> : null}
              </Fila>
              <T v="display" style={{ marginTop: espacio.m }} accessibilityRole="header">
                {evento.titulo}
              </T>
              <Fila gap={6} style={{ marginTop: espacio.s, flexWrap: 'wrap' }}>
                <T c="texto2">{tx('por')}</T>
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

              {/* Artistas */}
              {evento.artistas.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: espacio.l, marginHorizontal: -espacio.xl }} contentContainerStyle={{ gap: espacio.s, paddingHorizontal: espacio.xl }}>
                  {evento.artistas.map((a) => (
                    <Pulsable key={a.id} onPress={() => navigation.navigate('Artista', { id: a.id })} style={s.artista} accessibilityLabel={tx('Ver artista {0}', { 0: a.nombre })}>
                      <View style={s.artistaAvatar}>
                        <T v="cuerpoFuerte" c="acentoTexto">
                          {a.nombre[0]}
                        </T>
                      </View>
                      <T v="cuerpoFuerte">{a.nombre}</T>
                      <Icono n="chevron-forward" tam={14} c={color.texto3} />
                    </Pulsable>
                  ))}
                </ScrollView>
              )}

              {evento.fecha_original && (
                <View style={s.aplazado}>
                  <Icono n="calendar-outline" c={color.aviso} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="cuerpoFuerte">{tx('Cambio de fecha: antes era el {0}', { 0: fechaFrase(evento.fecha_original) })}</T>
                    <T v="nota" c="texto2">
                      {tx('Las entradas siguen valiendo.')}{' '}
                      {evento.reembolso_aplazamiento_hasta && new Date(evento.reembolso_aplazamiento_hasta) > new Date()
                        ? tx('Si ya tenías entradas y no puedes ir, pide el reembolso desde tu pedido hasta el {0}.', { 0: fechaFrase(evento.reembolso_aplazamiento_hasta) })
                        : ''}
                    </T>
                  </View>
                </View>
              )}

              {/* Datos clave */}
              <View style={s.tarjeta}>
                <Dato
                  icono="calendar"
                  titulo={fechaLarga(evento.inicia_en)}
                  texto={[
                    `${hora(evento.inicia_en)}${evento.termina_en ? ` – ${hora(evento.termina_en)}` : ''}`,
                    evento.puertas_abren_en ? tx('puertas {0}', { 0: hora(evento.puertas_abren_en) }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  onPress={() => void anadirAlCalendario(id)}
                  accion={tx('Añadir')}
                />
                <Separador m={0} />
                <Dato
                  icono="location"
                  titulo={evento.recinto}
                  texto={[evento.direccion, evento.ciudad].filter(Boolean).join(', ')}
                  onPress={evento.recinto_id ? () => navigation.navigate('Recinto', { id: evento.recinto_id! }) : undefined}
                  accion={evento.recinto_id ? tx('Ver') : undefined}
                />
              </View>

              {/* Descripción */}
              {evento.descripcion ? (
                <View style={{ marginTop: espacio.xxl, gap: espacio.s }}>
                  <T v="subtitulo">{tx('Sobre el evento')}</T>
                  <T c="texto2" numberOfLines={descripcionCompleta ? undefined : 4}>
                    {evento.descripcion}
                  </T>
                  {evento.descripcion.length > 180 && (
                    <Pulsable onPress={() => setDescripcionCompleta((v) => !v)} style={{ alignSelf: 'flex-start' }}>
                      <T v="cuerpoFuerte" c="acento">
                        {descripcionCompleta ? tx('Ver menos') : tx('Leer más')}
                      </T>
                    </Pulsable>
                  )}
                </View>
              ) : null}

              {/* Entradas */}
              <View style={{ marginTop: espacio.xxl, gap: espacio.m }} onLayout={(e) => (yEntradas.current = e.nativeEvent.layout.y)}>
                <Fila style={{ justifyContent: 'space-between' }}>
                  <T v="subtitulo">{tx('Entradas')}</T>
                  <T v="nota" c="texto3">
                    {tx('Precios con gastos incluidos')}
                  </T>
                </Fila>
                {evento.tramos.length === 0 && <T c="texto2">{tx('Las entradas aún no están disponibles.')}</T>}
                {conCola && evento.cola?.admitido && evento.cola.expira_en && (
                  <View style={s.turno}>
                    <Icono n="checkmark-circle" c={color.acento} />
                    <T v="cuerpoFuerte" style={{ flex: 1 }}>
                      {tx('¡Es tu turno! Compra antes de las {0}', { 0: hora(evento.cola.expira_en) })}
                    </T>
                  </View>
                )}
                {evento.tramos.map((t) => (
                  <FilaTramo
                    key={t.id}
                    eventoId={id}
                    tramo={t}
                    cantidad={cantidades[t.id] ?? 0}
                    bloqueado={!turnoOk}
                    butacas={butacas[t.id] ?? []}
                    onButacas={(b) => {
                      setReventa(null);
                      setButacas((x) => ({ ...x, [t.id]: b }));
                      setCantidades((c) => ({ ...c, [t.id]: b.length }));
                    }}
                    onCambio={(n) => {
                      haptica.toque();
                      setReventa(null);
                      setCantidades((c) => ({ ...c, [t.id]: n }));
                    }}
                    cantidadReventa={reventa?.tramoId === t.id ? reventa.cantidad : 0}
                    onCambioReventa={(n) => {
                      haptica.toque();
                      setCantidades({});
                      setCodigo(null);
                      setReventa(n > 0 ? { tramoId: t.id, cantidad: n } : null);
                    }}
                  />
                ))}
                {evento.max_por_usuario && (
                  <Fila gap={6}>
                    <Icono n="person-outline" tam={14} c={color.texto3} />
                    <T v="nota" c="texto3">
                      {tx('Máximo {0} entradas por persona', { 0: evento.max_por_usuario })}
                    </T>
                  </Fila>
                )}
                {evento.tiene_preventa && !acceso && <CodigoPreventa cargando={isFetching} onDesbloquear={(c) => setAcceso(c)} />}
                {acceso && !error && (
                  <Fila gap={6}>
                    <Icono n="lock-open" tam={14} c={color.acento} />
                    <T v="nota" c="acento">
                      {tx('Preventa desbloqueada con el código {0}', { 0: acceso })}
                    </T>
                  </Fila>
                )}
                {acceso && error && (
                  <View style={s.errorPreventa}>
                    <T v="nota" c="peligro" style={{ flex: 1 }}>
                      {mensajeDe(error)}
                    </T>
                    <Pulsable onPress={() => setAcceso(undefined)}>
                      <T v="nota" c="texto" style={{ fontWeight: '700' }}>
                        {tx('Probar otro')}
                      </T>
                    </Pulsable>
                  </View>
                )}
                {evento.extras.length > 0 && !reventa && (
                  <View style={{ gap: espacio.s, marginTop: espacio.s }}>
                    <T v="cuerpoFuerte">{tx('Completa tu plan')}</T>
                    {evento.extras.map((x) => (
                      <FilaExtra
                        key={x.id}
                        extra={x}
                        cantidad={extrasSel[x.id] ?? 0}
                        onCambio={(n) => {
                          haptica.toque();
                          setExtrasSel((e) => ({ ...e, [x.id]: n }));
                        }}
                      />
                    ))}
                  </View>
                )}
                {nEntradas > 0 && subtotal > 0 && !reventa && <CodigoPromo eventoId={id} codigo={codigo} onCambio={setCodigo} />}
                {nEntradas > 0 && base > 0 && (
                  <Pulsable onPress={() => setSeguro((v) => !v)} style={[s.seguro, seguro && { borderColor: color.acento }]} escala={0.99} accessibilityRole="switch" accessibilityState={{ checked: seguro }}>
                    <Icono n="umbrella-outline" c={seguro ? color.acento : color.texto2} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="cuerpoFuerte">{tx('Protección de reembolso · +{0}', { 0: precioExacto(costeSeguro) })}</T>
                      <T v="nota" c="texto2">
                        {tx('Si no puedes ir por enfermedad, un imprevisto o un viaje cancelado, te devolvemos el precio de las entradas.')}
                      </T>
                    </View>
                    <Switch value={seguro} onValueChange={setSeguro} trackColor={{ true: color.acento, false: color.superficie3 }} thumbColor={color.blanco} />
                  </Pulsable>
                )}
              </View>

              {(evento.registro_fan_activo || evento.registro_fan) && <TarjetaFans estado={evento.registro_fan} abierto={evento.registro_fan_activo} onInscribirse={() => void inscribirseFan()} />}

              <AntesDeIr evento={evento} />

              <View style={[s.tarjeta, { flexDirection: 'row', gap: espacio.m, padding: espacio.l }]}>
                <Icono n="shield-checkmark" c={color.acento} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="cuerpoFuerte">{tx('Compra protegida')}</T>
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
        <BotonIcono n="chevron-back" etiqueta={tx('Atrás')} onPress={() => navigation.goBack()} fondo="rgba(11,11,16,0.6)" />
        <Animated.View style={{ flex: 1, opacity: opacidadCabecera, paddingHorizontal: espacio.s }}>
          <T v="cabecera" numberOfLines={1} centro>
            {evento?.titulo}
          </T>
        </Animated.View>
        <Fila>
          <BotonIcono n="share-outline" etiqueta={tx('Compartir')} onPress={() => void compartir()} fondo="rgba(11,11,16,0.6)" />
          <BotonIcono
            n={evento?.favorito ? 'heart' : 'heart-outline'}
            c={evento?.favorito ? color.peligro : color.texto}
            etiqueta={evento?.favorito ? tx('Quitar de favoritos') : tx('Guardar en favoritos')}
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
          {conCola && !evento.cola?.admitido ? (
            <Fila gap={espacio.l}>
              <View style={{ flex: 1 }}>
                <T v="cuerpoFuerte">{evento.cola?.en_cola ? tx('Estás en la cola') : tx('Venta con cola virtual')}</T>
                <T v="nota" c="texto2">
                  {evento.cola?.en_cola ? tx('{0} personas delante · ~{1} min', { 0: evento.cola.por_delante ?? 0, 1: evento.cola.minutos_estimados ?? 1 }) : tx('Hay mucha demanda: coge tu turno')}
                </T>
              </View>
              <Boton
                bloque={false}
                icono={evento.cola?.en_cola ? 'hourglass-outline' : 'people'}
                cargando={uniendose}
                onPress={() => (evento.cola?.en_cola ? navigation.navigate('Cola', { eventoId: id, titulo: evento.titulo }) : void entrarEnCola())}
              >
                {evento.cola?.en_cola ? tx('Ver mi turno') : tx('Entrar en la cola')}
              </Boton>
            </Fila>
          ) : nEntradas > 0 || nExtras > 0 ? (
            <Fila gap={espacio.l}>
              <View style={{ flex: 1 }}>
                <T v="nota" c="texto2">
                  {nEntradas > 0 ? plural(nEntradas, 'entrada', 'entradas') : ''}
                  {reventa ? ' de reventa' : ''}
                  {nExtras > 0 ? tx('{0}{1}', { 0: nEntradas > 0 ? ' + ' : '', 1: plural(nExtras, 'extra', 'extras') }) : ''}
                  {descuento > 0 ? ` · −${precioExacto(descuento)}` : ''}
                </T>
                <T v="subtitulo">{totalEstimado === 0 ? tx('Gratis') : precioExacto(totalEstimado)}</T>
              </View>
              <Boton onPress={() => void comprar()} cargando={comprando} bloque={false} icono="arrow-forward" style={{ minWidth: 160 }}>
                {totalEstimado === 0 ? tx('Reservar') : tx('Continuar')}
              </Boton>
            </Fila>
          ) : aLaVenta ? (
            <Fila gap={espacio.l}>
              <View style={{ flex: 1 }}>
                <T v="nota" c="texto2">
                  {tx('Desde')}
                </T>
                <T v="subtitulo">{precio(Math.min(...evento.tramos.filter((t) => t.estado === 'a_la_venta' || t.reventa_disponibles > 0).map((t) => t.precio_total_centimos)))}</T>
              </View>
              <Boton bloque={false} icono="ticket" style={{ minWidth: 160 }} onPress={irAEntradas}>
                {tx('Elegir entradas')}
              </Boton>
            </Fila>
          ) : (
            <Fila gap={espacio.l}>
              <View style={{ flex: 1 }}>
                <T v="cuerpoFuerte">{tx('Agotado')}</T>
                <T v="nota" c="texto2">
                  {evento.en_lista_espera ? tx('Estás en la lista de espera') : tx('Te avisamos si se liberan entradas')}
                </T>
              </View>
              <Boton
                bloque={false}
                v={evento.en_lista_espera ? 'secundario' : 'primario'}
                icono={evento.en_lista_espera ? 'notifications-off-outline' : 'notifications'}
                cargando={esperando}
                onPress={() => void alternarListaEspera()}
              >
                {evento.en_lista_espera ? tx('Salir') : tx('Avisarme')}
              </Boton>
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
    <Pulsable onPress={onPress} escala={0.99} accessibilityLabel={tx('{0}. {1}', { 0: titulo, 1: accion ?? '' })}>
      {contenido}
    </Pulsable>
  ) : (
    contenido
  );
}

function FilaTramo({
  eventoId,
  tramo,
  cantidad,
  onCambio,
  bloqueado,
  cantidadReventa,
  onCambioReventa,
  butacas,
  onButacas,
}: {
  eventoId: string;
  butacas: Butaca[];
  onButacas: (b: Butaca[]) => void;
  tramo: Tramo;
  cantidad: number;
  onCambio: (n: number) => void;
  bloqueado: boolean;
  cantidadReventa: number;
  onCambioReventa: (n: number) => void;
}) {
  const disponible = tramo.estado === 'a_la_venta';
  const max = Math.min(tramo.max_por_pedido, tramo.disponibles);
  const pocas = disponible && tramo.disponibles <= 20;
  const reventa = tramo.reventa_disponibles > 0 && !disponible;
  const elegida = cantidad > 0 || cantidadReventa > 0;
  const [plano, setPlano] = useState(false);
  return (
    <View style={[s.tramo, elegida && { borderColor: color.acento, backgroundColor: 'rgba(0,255,135,0.05)' }, !disponible && !reventa && { opacity: 0.6 }]}>
      <Fila gap={espacio.m}>
        <View style={{ flex: 1, gap: 2 }}>
          <Fila gap={espacio.s} style={{ flexWrap: 'wrap' }}>
            <T v="cuerpoFuerte" style={{ fontWeight: '700', flexShrink: 1 }}>
              {tramo.nombre}
            </T>
            {tramo.preventa && <Insignia texto={tx('Preventa')} tono="info" icono="lock-open" />}
            {tramo.accesible && <Insignia texto={tx('Accesible')} tono="info" icono="accessibility" />}
            {tramo.numerado && <Insignia texto={tx('Numerada')} tono="info" icono="grid-outline" />}
          </Fila>
          {tramo.descripcion ? (
            <T v="nota" c="texto2">
              {tramo.descripcion}
            </T>
          ) : null}
          {tramo.incluye_acompanante && (
            <T v="nota" c="info">
              {tx('Incluye entrada gratis para acompañante')}
            </T>
          )}
          <Fila gap={espacio.s} style={{ marginTop: 4, flexWrap: 'wrap' }}>
            <T v="cabecera">{precio(tramo.precio_total_centimos)}</T>
            {tramo.gastos_centimos > 0 && (
              <T v="nota" c="texto3">
                {tx('incl. {0} de gastos', { 0: precioExacto(tramo.gastos_centimos) })}
              </T>
            )}
          </Fila>
          <Fila gap={espacio.s} style={{ marginTop: 2 }}>
            {tramo.estado === 'agotado' && <Insignia texto={tx('Agotado')} tono="peligro" />}
            {tramo.estado === 'proximamente' && <Insignia texto={tramo.abre_al_agotar ? tx('Abre al agotarse {0}', { 0: tramo.abre_al_agotar }) : tx('Próximamente')} tono="info" />}
            {tramo.estado === 'finalizado' && <Insignia texto={tx('Venta cerrada')} />}
            {pocas && <Insignia texto={tx('Quedan {0}', { 0: tramo.disponibles })} tono="aviso" />}
          </Fila>
        </View>
        {disponible && !bloqueado && !tramo.numerado && <Contador valor={cantidad} max={max} onCambio={onCambio} />}
        {disponible && !bloqueado && tramo.numerado && (
          <Boton pequeno bloque={false} v={plano ? 'secundario' : 'primario'} icono={plano ? 'chevron-up' : 'grid-outline'} onPress={() => setPlano((v) => !v)}>
            {plano ? tx('Cerrar') : butacas.length ? `${butacas.length} elegidas` : tx('Elegir butacas')}
          </Boton>
        )}
        {disponible && bloqueado && <Icono n="lock-closed-outline" c={color.texto3} />}
      </Fila>
      {tramo.numerado && !plano && butacas.length > 0 && (
        <T v="nota" c="acento" style={{ marginTop: espacio.s, fontWeight: '700' }}>
          {describirButacas(butacas)}
        </T>
      )}
      {tramo.numerado && plano && disponible && !bloqueado && (
        <View style={{ marginTop: espacio.l }}>
          <PlanoAsientos eventoId={eventoId} tramoId={tramo.id} max={max} elegidas={butacas} onCambio={onButacas} />
        </View>
      )}
      {reventa && (
        <View style={s.reventa}>
          <Icono n="swap-horizontal" c={color.info} />
          <View style={{ flex: 1 }}>
            <T v="cuerpoFuerte">{tx('Reventa oficial')}</T>
            <T v="nota" c="texto2">
              {plural(tramo.reventa_disponibles, 'entrada', 'entradas')} de otros fans a precio original
            </T>
          </View>
          {!bloqueado && <Contador valor={cantidadReventa} max={Math.min(tramo.reventa_disponibles, 10)} onCambio={onCambioReventa} />}
        </View>
      )}
    </View>
  );
}

const ICONO_EXTRA: Record<Extra['tipo'], NombreIcono> = { parking: 'car-outline', merch: 'shirt-outline', vip: 'star-outline', comida: 'fast-food-outline', otro: 'add-circle-outline' };

/** Extra (parking, merch, VIP…) que se añade a la compra. */
function FilaExtra({ extra, cantidad, onCambio }: { extra: Extra; cantidad: number; onCambio: (n: number) => void }) {
  const agotado = extra.disponibles <= 0;
  return (
    <View style={[s.tramo, { paddingVertical: espacio.m }, cantidad > 0 && { borderColor: color.acento }, agotado && { opacity: 0.6 }]}>
      <Fila gap={espacio.m}>
        <View style={s.datoIcono}>
          <Icono n={ICONO_EXTRA[extra.tipo]} tam={20} c={color.acento} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="cuerpoFuerte">{extra.nombre}</T>
          {extra.descripcion ? (
            <T v="nota" c="texto2" numberOfLines={2}>
              {extra.descripcion}
            </T>
          ) : null}
          <T v="cuerpoFuerte" c="acento">
            {precio(extra.precio_centimos)}
          </T>
        </View>
        {agotado ? <Insignia texto={tx('Agotado')} tono="peligro" /> : <Contador valor={cantidad} max={Math.min(extra.max_por_pedido, extra.disponibles)} onCambio={onCambio} />}
      </Fila>
    </View>
  );
}

/** Registro de fans verificados: inscripción y resultado del sorteo. */
function TarjetaFans({ estado, abierto, onInscribirse }: { estado: EventoDetalle['registro_fan']; abierto: boolean; onInscribirse: () => void }) {
  const textos = {
    inscrito: [tx('Estás inscrito'), tx('Cuando se haga el sorteo te avisaremos. Si sales elegido, verás aquí la preventa.')],
    seleccionado: [tx('¡Has sido seleccionado!'), tx('Ya puedes comprar en la preventa para fans: la tienes arriba, en Entradas.')],
    no_seleccionado: [tx('Esta vez no hubo suerte'), tx('Te avisaremos cuando abra la venta general.')],
  } as const;
  const [titulo, texto] = estado ? textos[estado] : [tx('Registro de fans verificados'), tx('Inscríbete para optar a la preventa. Se sortean las plazas entre los fans registrados.')];
  return (
    <View style={[s.tarjeta, { padding: espacio.l, gap: espacio.m }, estado === 'seleccionado' && { borderColor: color.acento }]}>
      <Fila gap={espacio.m} style={{ alignItems: 'flex-start' }}>
        <Icono n={estado === 'seleccionado' ? 'trophy' : 'shield-checkmark-outline'} c={estado === 'seleccionado' ? color.acento : color.info} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="cuerpoFuerte">{titulo}</T>
          <T v="nota" c="texto2">
            {texto}
          </T>
        </View>
      </Fila>
      {!estado && abierto && (
        <Boton v="secundario" pequeno icono="person-add-outline" onPress={onInscribirse}>
          {tx('Inscribirme')}
        </Boton>
      )}
    </View>
  );
}

/** Campo para desbloquear entradas de preventa. */
function CodigoPreventa({ onDesbloquear, cargando }: { onDesbloquear: (codigo: string) => void; cargando: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  if (!abierto) {
    return (
      <Pulsable onPress={() => setAbierto(true)} style={s.enlace} escala={0.98}>
        <Icono n="key-outline" tam={18} c={color.info} />
        <T v="cuerpoFuerte" style={{ color: color.info }}>
          {tx('¿Tienes un código de preventa?')}
        </T>
      </Pulsable>
    );
  }
  return (
    <View style={s.cajaCodigo}>
      <Icono n="key-outline" tam={18} c={color.texto3} />
      <TextInput
        value={texto}
        onChangeText={(t) => setTexto(t.toUpperCase())}
        placeholder={tx('CÓDIGO DE PREVENTA')}
        placeholderTextColor={color.texto3}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        accessibilityLabel={tx('Código de preventa')}
        style={s.entradaCodigo}
        onSubmitEditing={() => texto.trim() && onDesbloquear(texto.trim())}
      />
      <Boton pequeno bloque={false} cargando={cargando} deshabilitado={texto.trim().length < 3} onPress={() => onDesbloquear(texto.trim())}>
        {tx('Desbloquear')}
      </Boton>
    </View>
  );
}

/** Código de descuento: se comprueba al momento y se aplica al comprar. */
function CodigoPromo({ eventoId, codigo, onCambio }: { eventoId: string; codigo: CodigoDescuento | null; onCambio: (c: CodigoDescuento | null) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [comprobando, setComprobando] = useState(false);

  async function aplicar() {
    setComprobando(true);
    setError(null);
    try {
      const r = await api<{ codigo: CodigoDescuento }>(`/eventos/${eventoId}/codigos/${encodeURIComponent(texto.trim())}`);
      haptica.exito();
      onCambio(r.codigo);
      setAbierto(false);
    } catch (e) {
      haptica.error();
      setError(mensajeDe(e));
    } finally {
      setComprobando(false);
    }
  }

  if (codigo) {
    return (
      <View style={[s.cajaCodigo, { borderColor: color.acento, backgroundColor: color.acentoSuave }]}>
        <Icono n="pricetag" tam={18} c={color.acento} />
        <View style={{ flex: 1 }}>
          <T v="cuerpoFuerte">{codigo.codigo}</T>
          <T v="nota" c="texto2">
            {codigo.descripcion ?? (codigo.tipo === 'porcentaje' ? `${codigo.valor} % de descuento` : `${precioExacto(codigo.valor)} de descuento`)}
          </T>
        </View>
        <Pulsable onPress={() => onCambio(null)} accessibilityLabel={tx('Quitar código')} hitSlop={10}>
          <Icono n="close-circle" c={color.texto2} />
        </Pulsable>
      </View>
    );
  }
  if (!abierto) {
    return (
      <Pulsable onPress={() => setAbierto(true)} style={s.enlace} escala={0.98}>
        <Icono n="pricetag-outline" tam={18} c={color.acento} />
        <T v="cuerpoFuerte" c="acento">
          {tx('Añadir código de descuento')}
        </T>
      </Pulsable>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <View style={[s.cajaCodigo, error ? { borderColor: color.peligro } : null]}>
        <Icono n="pricetag-outline" tam={18} c={color.texto3} />
        <TextInput
          value={texto}
          onChangeText={(t) => {
            setTexto(t.toUpperCase());
            setError(null);
          }}
          placeholder={tx('CÓDIGO')}
          placeholderTextColor={color.texto3}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          accessibilityLabel={tx('Código de descuento')}
          style={s.entradaCodigo}
          onSubmitEditing={() => texto.trim() && void aplicar()}
        />
        <Boton pequeno bloque={false} cargando={comprobando} deshabilitado={texto.trim().length < 3} onPress={() => void aplicar()}>
          {tx('Aplicar')}
        </Boton>
      </View>
      {error && (
        <T v="nota" c="peligro">
          {error}
        </T>
      )}
    </View>
  );
}

/** Información práctica del recinto: cómo llegar, parking, accesibilidad… */
export function AntesDeIr({ evento }: { evento: Pick<EventoDetalle, 'recinto_info' | 'puertas_abren_en'> }) {
  const r = evento.recinto_info;
  const filas: [NombreIcono, string, string | null | undefined][] = [
    ['time-outline', tx('Apertura de puertas'), evento.puertas_abren_en ? tx('A las {0}', { 0: hora(evento.puertas_abren_en) }) : null],
    ['navigate-outline', tx('Cómo llegar'), r?.como_llegar],
    ['car-outline', tx('Parking'), r?.parking],
    ['accessibility-outline', tx('Accesibilidad'), r?.accesibilidad],
    ['ban-outline', tx('No está permitido'), r?.objetos_prohibidos],
  ];
  const visibles = filas.filter(([, , v]) => v);
  if (!visibles.length) return null;
  return (
    <View style={{ marginTop: espacio.xxl, gap: espacio.m }}>
      <T v="subtitulo">{tx('Antes de ir')}</T>
      <View style={[s.tarjeta, { marginTop: 0 }]}>
        {visibles.map(([icono, titulo, valor], i) => (
          <View key={titulo}>
            {i > 0 && <Separador m={0} />}
            <Fila gap={espacio.m} style={{ padding: espacio.l, alignItems: 'flex-start' }}>
              <Icono n={icono} c={color.texto2} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="cuerpoFuerte">{titulo}</T>
                <T v="nota" c="texto2">
                  {valor}
                </T>
              </View>
            </Fila>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  cuerpo: { paddingHorizontal: espacio.xl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  tarjeta: { marginTop: espacio.xl, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde, overflow: 'hidden' },
  datoIcono: { width: 40, height: 40, borderRadius: radio.m, backgroundColor: color.acentoSuave, alignItems: 'center', justifyContent: 'center' },
  tramo: { padding: espacio.l, borderRadius: radio.l, borderWidth: 1.5, borderColor: color.borde, backgroundColor: color.superficie },
  cabeceraFondo: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: color.fondo, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.borde },
  cabeceraFlotante: { position: 'absolute', left: espacio.l, right: espacio.l, flexDirection: 'row', alignItems: 'center' },
  artista: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, paddingLeft: 4, paddingRight: espacio.m, height: 44, borderRadius: radio.total, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  artistaAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: color.acento, alignItems: 'center', justifyContent: 'center' },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, alignSelf: 'flex-start', paddingVertical: espacio.xs },
  cajaCodigo: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, minHeight: 56, paddingLeft: 14, paddingRight: 8, borderRadius: radio.m, borderWidth: 1.5, borderColor: color.borde, backgroundColor: color.superficie },
  entradaCodigo: { flex: 1, ...tipo.cuerpoFuerte, color: color.texto, letterSpacing: 1.5, outlineStyle: 'none' } as object,
  turno: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.acentoSuave, borderWidth: 1, borderColor: color.acento },
  reventa: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, marginTop: espacio.m, paddingTop: espacio.m, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.borde },
  seguro: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, padding: espacio.l, borderRadius: radio.l, borderWidth: 1.5, borderColor: color.borde, backgroundColor: color.superficie },
  aplazado: { flexDirection: 'row', gap: espacio.m, marginTop: espacio.l, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.avisoSuave, borderWidth: 1, borderColor: color.aviso },
  errorPreventa: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, padding: espacio.m, borderRadius: radio.m, backgroundColor: color.peligroSuave },
});
