import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Fila, Icono, Separador, T } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { ImagenEvento } from '../../components/evento';
import { Cabecera, Pantalla } from '../../components/pantalla';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { usePedido } from '../../lib/consultas';
import { cuandoEs, mmss, precioExacto } from '../../lib/formato';
import { usePasarela } from '../../lib/pasarela';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';
import { traducir as tx } from '../../lib/i18n';
import { describirButacas } from '../../components/plano';

function useSegundosHasta(iso?: string) {
  const calcular = () => (iso ? Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000)) : 0);
  const [s, setS] = useState(calcular);
  useEffect(() => {
    setS(calcular());
    const t = setInterval(() => setS(calcular()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);
  return s;
}

export function PagoScreen({ navigation, route }: PropsPantalla<'Pago'>) {
  const { pedidoId, clientSecret } = route.params;
  const { data: pedido, error, refetch } = usePedido(pedidoId, false);
  const { usuario } = useAuth();
  const pagar = usePasarela();
  const avisar = useAviso();
  const [pagando, setPagando] = useState(false);
  const restantes = useSegundosHasta(pedido?.expira_en);

  useEffect(() => {
    if (pedido?.estado === 'pagado') navigation.replace('Confirmacion', { pedidoId });
  }, [pedido?.estado, navigation, pedidoId]);

  async function onPagar() {
    if (!clientSecret) return;
    setPagando(true);
    const r = await pagar(clientSecret, usuario?.nombre);
    setPagando(false);
    if (r.estado === 'pagado') navigation.replace('Confirmacion', { pedidoId });
    else if (r.estado === 'error') avisar(r.mensaje, 'error');
  }

  async function cancelar() {
    await api(`/pedidos/${pedidoId}/cancelar`, { method: 'POST' }).catch(() => undefined);
    navigation.goBack();
  }

  const caducado = pedido && (pedido.estado === 'expirado' || pedido.estado === 'cancelado' || (pedido.estado === 'pendiente' && restantes === 0));
  const urgente = restantes > 0 && restantes < 120;

  return (
    <Pantalla
      cabecera={<Cabecera titulo={tx('Confirmar compra')} />}
      pie={
        pedido && !caducado ? (
          <View style={{ gap: espacio.s }}>
            <Boton onPress={() => void onPagar()} cargando={pagando} icono="lock-closed">
              {tx('Pagar {0}', { 0: precioExacto(pedido.total_centimos) })}
            </Boton>
            <T v="nota" c="texto3" centro>
              {tx('Pago seguro con Stripe · Tarjeta, Apple Pay o Google Pay')}
            </T>
          </View>
        ) : undefined
      }
    >
      {error ? (
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      ) : !pedido ? (
        <View style={{ gap: espacio.m }}>
          <Esqueleto alto={88} r={radio.l} />
          <Esqueleto alto={180} r={radio.l} />
        </View>
      ) : caducado ? (
        <Vacio
          icono="time-outline"
          titulo={tx('Se acabó el tiempo')}
          texto={tx('Hemos liberado las entradas para que otras personas puedan comprarlas. Puedes volver a intentarlo.')}
          accion={<Boton onPress={() => navigation.replace('Evento', { id: pedido.evento.id })}>{tx('Volver al evento')}</Boton>}
        />
      ) : (
        <>
          <View style={[s.reloj, urgente && { backgroundColor: color.avisoSuave, borderColor: color.aviso }]}>
            <Icono n="timer-outline" c={urgente ? color.aviso : color.acento} />
            <T v="cuerpoFuerte" style={{ flex: 1 }}>
              {tx('Te guardamos las entradas')}
            </T>
            <T v="cabecera" c={urgente ? 'aviso' : 'acento'} style={{ fontVariant: ['tabular-nums'] }} accessibilityLabel={tx('Quedan {0} minutos', { 0: mmss(restantes) })}>
              {mmss(restantes)}
            </T>
          </View>

          <Fila gap={espacio.m} style={s.tarjeta}>
            <ImagenEvento uri={pedido.evento.imagen_url} categoria={pedido.evento.categoria} style={{ width: 64, height: 64 }} r={radio.m} />
            <View style={{ flex: 1 }}>
              <T v="cuerpoFuerte" numberOfLines={2} style={{ fontWeight: '700' }}>
                {pedido.evento.titulo}
              </T>
              {pedido.es_reventa && (
                <T v="nota" c="info">
                  {tx('Reventa oficial · precio original')}
                </T>
              )}
              <T v="nota" c="texto2">
                {cuandoEs(pedido.evento.inicia_en)}
              </T>
              <T v="nota" c="texto3">
                {pedido.evento.recinto} · {pedido.evento.ciudad}
              </T>
            </View>
          </Fila>

          <View style={[s.tarjeta, { gap: espacio.m }]}>
            {pedido.items.map((i) => (
              <Fila key={i.tramo.id} style={{ justifyContent: 'space-between' }}>
                <T c="texto2">
                  {i.cantidad} × {i.tramo.nombre}
                </T>
                <T v="cuerpoFuerte">{precioExacto(i.cantidad * i.precio_unitario_centimos)}</T>
              </Fila>
            ))}
            {pedido.asientos?.length > 0 && (
              <T v="nota" c="acento" style={{ fontWeight: '700', marginTop: -4 }}>
                {describirButacas(pedido.asientos.map((a, k) => ({ id: String(k), ...a })), tx)}
              </T>
            )}
            {pedido.extras?.map((x) => (
              <Fila key={x.extra.id} style={{ justifyContent: 'space-between' }}>
                <T c="texto2">
                  {x.cantidad} × {x.extra.nombre}
                </T>
                <T v="cuerpoFuerte">{precioExacto(x.cantidad * x.precio_unitario_centimos)}</T>
              </Fila>
            ))}
            {pedido.descuento_centimos > 0 && (
              <Fila style={{ justifyContent: 'space-between' }}>
                <T c="acento">{tx('Descuento')}</T>
                <T v="cuerpoFuerte" c="acento">
                  {tx('−{0}', { 0: precioExacto(pedido.descuento_centimos) })}
                </T>
              </Fila>
            )}
            <Fila style={{ justifyContent: 'space-between' }}>
              <T c="texto2">{tx('Gastos de gestión')}</T>
              <T v="cuerpoFuerte">{precioExacto(pedido.gastos_centimos)}</T>
            </Fila>
            {pedido.seguro_centimos > 0 && (
              <Fila style={{ justifyContent: 'space-between' }}>
                <T c="texto2">{tx('Protección de reembolso')}</T>
                <T v="cuerpoFuerte">{precioExacto(pedido.seguro_centimos)}</T>
              </Fila>
            )}
            <Separador m={espacio.xs} />
            <Fila style={{ justifyContent: 'space-between' }}>
              <T v="cabecera">{tx('Total')}</T>
              <T v="subtitulo">{precioExacto(pedido.total_centimos)}</T>
            </Fila>
          </View>

          <Fila gap={espacio.m} style={{ marginTop: espacio.xl, alignItems: 'flex-start' }}>
            <Icono n="information-circle-outline" c={color.texto3} />
            <T v="nota" c="texto3" style={{ flex: 1 }}>
              {tx('Recibirás las entradas en la app nada más pagar. Al comprar aceptas los términos de uso y la política de devoluciones del organizador.')}
            </T>
          </Fila>
          <Boton v="fantasma" onPress={() => void cancelar()} style={{ marginTop: espacio.l }}>
            {tx('Cancelar y liberar entradas')}
          </Boton>
        </>
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  reloj: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, padding: espacio.l, borderRadius: radio.l, borderWidth: 1, borderColor: color.acento, backgroundColor: color.acentoSuave },
  tarjeta: { marginTop: espacio.l, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
});
