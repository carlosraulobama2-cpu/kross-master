import { StyleSheet, View } from 'react-native';
import { Boton, Fila, Icono, Insignia, Pulsable, Separador, T } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { ImagenEvento } from '../../components/evento';
import { Cabecera, Pantalla } from '../../components/pantalla';
import { urlAbsoluta } from '../../lib/calendario';
import { usePedido, usePedidos } from '../../lib/consultas';
import { fechaLarga, hora, plural, precioExacto } from '../../lib/formato';
import type { EstadoPedido } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';
import * as WebBrowser from 'expo-web-browser';

const ESTADO: Record<EstadoPedido, { texto: string; tono: 'acento' | 'aviso' | 'neutro' | 'info' }> = {
  pagado: { texto: 'Pagado', tono: 'acento' },
  pendiente: { texto: 'Pendiente', tono: 'aviso' },
  expirado: { texto: 'Caducado', tono: 'neutro' },
  cancelado: { texto: 'Cancelado', tono: 'neutro' },
  reembolsado: { texto: 'Reembolsado', tono: 'info' },
};

export function PedidosScreen({ navigation }: PropsPantalla<'Pedidos'>) {
  const { data, error, isPending, refetch, isRefetching } = usePedidos();
  return (
    <Pantalla cabecera={<Cabecera titulo="Mis pedidos" />} recargar={() => void refetch()} recargando={isRefetching}>
      {error ? (
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      ) : isPending ? (
        <View style={{ gap: espacio.s }}>
          {[0, 1, 2].map((i) => (
            <Esqueleto key={i} alto={84} r={radio.l} />
          ))}
        </View>
      ) : data.length === 0 ? (
        <Vacio icono="receipt-outline" titulo="Aún no has comprado nada" texto="Aquí tendrás todas tus compras con su recibo." />
      ) : (
        <View style={{ gap: espacio.s }}>
          {data.map((p) => {
            const n = p.items.reduce((a, i) => a + i.cantidad, 0);
            return (
              <Pulsable key={p.id} onPress={() => navigation.navigate('Pedido', { id: p.id })} style={s.fila} escala={0.98}>
                <ImagenEvento uri={p.evento.imagen_url} categoria={p.evento.categoria} style={{ width: 56, height: 56 }} r={radio.m} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="cuerpoFuerte" numberOfLines={1}>
                    {p.evento.titulo}
                  </T>
                  <T v="nota" c="texto2">
                    {plural(n, 'entrada', 'entradas')} · {precioExacto(p.total_centimos)}
                  </T>
                  <T v="nota" c="texto3">
                    {fechaLarga(p.pagado_en ?? p.creado_en)}
                  </T>
                </View>
                <Insignia texto={ESTADO[p.estado].texto} tono={ESTADO[p.estado].tono} />
              </Pulsable>
            );
          })}
        </View>
      )}
    </Pantalla>
  );
}

export function PedidoScreen({ navigation, route }: PropsPantalla<'Pedido'>) {
  const { data: p, error, refetch } = usePedido(route.params.id, false);
  return (
    <Pantalla
      cabecera={<Cabecera titulo={p ? `Pedido ${p.id.slice(0, 8).toUpperCase()}` : 'Pedido'} />}
      pie={
        p?.recibo_url ? (
          <Boton icono="document-text-outline" onPress={() => void WebBrowser.openBrowserAsync(urlAbsoluta(p.recibo_url!))}>
            Ver recibo
          </Boton>
        ) : undefined
      }
    >
      {error ? (
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      ) : !p ? (
        <Esqueleto alto={240} r={radio.l} />
      ) : (
        <>
          <Pulsable onPress={() => navigation.navigate('Evento', { id: p.evento.id })} style={s.fila} escala={0.98}>
            <ImagenEvento uri={p.evento.imagen_url} categoria={p.evento.categoria} style={{ width: 64, height: 64 }} r={radio.m} />
            <View style={{ flex: 1 }}>
              <T v="cuerpoFuerte">{p.evento.titulo}</T>
              <T v="nota" c="texto2">
                {fechaLarga(p.evento.inicia_en)} · {hora(p.evento.inicia_en)}
              </T>
              <T v="nota" c="texto3">
                {p.evento.recinto}, {p.evento.ciudad}
              </T>
            </View>
            <Icono n="chevron-forward" c={color.texto3} />
          </Pulsable>
          <View style={[s.fila, { flexDirection: 'column', alignItems: 'stretch', gap: espacio.m, marginTop: espacio.l }]}>
            <Fila style={{ justifyContent: 'space-between' }}>
              <T c="texto2">Estado</T>
              <Insignia texto={ESTADO[p.estado].texto} tono={ESTADO[p.estado].tono} />
            </Fila>
            {p.items.map((i) => (
              <Fila key={i.tramo.id} style={{ justifyContent: 'space-between' }}>
                <T c="texto2">
                  {i.cantidad} × {i.tramo.nombre}
                </T>
                <T v="cuerpoFuerte">{precioExacto(i.cantidad * i.precio_unitario_centimos)}</T>
              </Fila>
            ))}
            {p.descuento_centimos > 0 && (
              <Fila style={{ justifyContent: 'space-between' }}>
                <T c="acento">Descuento</T>
                <T v="cuerpoFuerte" c="acento">
                  −{precioExacto(p.descuento_centimos)}
                </T>
              </Fila>
            )}
            <Fila style={{ justifyContent: 'space-between' }}>
              <T c="texto2">Gastos de gestión</T>
              <T v="cuerpoFuerte">{precioExacto(p.gastos_centimos)}</T>
            </Fila>
            <Separador m={0} />
            <Fila style={{ justifyContent: 'space-between' }}>
              <T v="cabecera">Total</T>
              <T v="subtitulo">{precioExacto(p.total_centimos)}</T>
            </Fila>
            {p.pagado_en && (
              <T v="nota" c="texto3">
                Pagado el {fechaLarga(p.pagado_en)} a las {hora(p.pagado_en)}
              </T>
            )}
          </View>
        </>
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, padding: espacio.m, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
});
