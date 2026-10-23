import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Fila, Icono, T, type NombreIcono } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { Cabecera, Pantalla } from '../../components/pantalla';
import { api } from '../../lib/api';
import { useNotificaciones } from '../../lib/consultas';
import { haceCuanto } from '../../lib/formato';
import { color, espacio, radio } from '../../theme';
import { traducir as tx } from '../../lib/i18n';

const ICONOS: Record<string, NombreIcono> = {
  pedido: 'ticket',
  transferencia: 'gift',
  recordatorio: 'alarm',
  info: 'information-circle',
  reventa: 'swap-horizontal',
  lista_espera: 'notifications',
  novedad: 'sparkles',
  fan: 'trophy',
};

export function NotificacionesScreen() {
  const qc = useQueryClient();
  const { data, error, isPending, refetch, isRefetching } = useNotificaciones();

  // Al abrir la bandeja se marcan como leídas (el punto se mantiene en esta visita).
  useEffect(() => {
    if (data?.some((n) => !n.leida)) {
      void api('/me/notificaciones/leer', { method: 'POST', body: {} }).then(() =>
        setTimeout(() => void qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('notificaciones') }), 4000),
      );
    }
  }, [data, qc]);

  return (
    <Pantalla cabecera={<Cabecera titulo={tx('Notificaciones')} />} recargar={() => void refetch()} recargando={isRefetching}>
      {error ? (
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      ) : isPending ? (
        <View style={{ gap: espacio.m }}>
          {[0, 1, 2].map((i) => (
            <Esqueleto key={i} alto={76} r={radio.l} />
          ))}
        </View>
      ) : data.length === 0 ? (
        <Vacio icono="notifications-off-outline" titulo={tx('Todo al día')} texto={tx('Aquí te avisaremos de tus compras, transferencias y recordatorios.')} />
      ) : (
        <View style={{ gap: espacio.s }}>
          {data.map((n) => (
            <Fila key={n.id} gap={espacio.m} style={[s.fila, !n.leida && { borderColor: 'rgba(0,255,135,0.35)' }]}>
              <View style={s.icono}>
                <Icono n={ICONOS[n.tipo] ?? 'information-circle'} c={color.acento} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Fila style={{ justifyContent: 'space-between' }}>
                  <T v="cuerpoFuerte" style={{ flex: 1 }} numberOfLines={1}>
                    {n.titulo}
                  </T>
                  <T v="nota" c="texto3">
                    {haceCuanto(n.creado_en)}
                  </T>
                </Fila>
                <T v="nota" c="texto2">
                  {n.cuerpo}
                </T>
              </View>
              {!n.leida && <View style={s.punto} />}
            </Fila>
          ))}
        </View>
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  fila: { alignItems: 'flex-start', padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  icono: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.acentoSuave, alignItems: 'center', justifyContent: 'center' },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.acento, marginTop: 6 },
});
