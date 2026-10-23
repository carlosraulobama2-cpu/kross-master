import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Fila, Icono, Pulsable, T } from '../../components/base';
import { BilleteEvento } from '../../components/entrada';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { Pantalla } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { invalidarYo, useEntradas, useTransferencias } from '../../lib/consultas';
import type { Entrada, Transferencia } from '../../lib/tipos';
import type { PropsPestana } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

export function EntradasScreen({ navigation }: PropsPestana<'Entradas'>) {
  const { usuario } = useAuth();
  const { data, error, isPending, refetch, isRefetching } = useEntradas();
  const { data: transferencias, refetch: refetchT } = useTransferencias();
  const [vista, setVista] = useState<'proximas' | 'pasadas'>('proximas');

  // Agrupa por evento y separa próximas de pasadas (6 h de margen tras empezar).
  const grupos = useMemo(() => {
    const porEvento = new Map<string, Entrada[]>();
    for (const e of data ?? []) porEvento.set(e.evento.id, [...(porEvento.get(e.evento.id) ?? []), e]);
    const limite = Date.now() - 6 * 3600_000;
    const todos = [...porEvento.values()];
    const esProxima = (g: Entrada[]) => new Date(g[0]!.evento.inicia_en).getTime() > limite && g.some((e) => e.estado === 'valida');
    return {
      proximas: todos.filter(esProxima).sort((a, b) => a[0]!.evento.inicia_en.localeCompare(b[0]!.evento.inicia_en)),
      pasadas: todos.filter((g) => !esProxima(g)).sort((a, b) => b[0]!.evento.inicia_en.localeCompare(a[0]!.evento.inicia_en)),
    };
  }, [data]);

  if (!usuario) {
    return (
      <Pantalla>
        <T v="titulo">Entradas</T>
        <Vacio
          icono="ticket-outline"
          titulo="Tus entradas, siempre a mano"
          texto="Inicia sesión para ver tus entradas. Funcionan sin conexión y su QR cambia cada 30 segundos para que nadie pueda copiarlas."
          accion={<Boton onPress={() => navigation.navigate('Acceso')}>Iniciar sesión</Boton>}
        />
      </Pantalla>
    );
  }

  const lista = grupos[vista];

  return (
    <Pantalla
      recargar={() => {
        void refetch();
        void refetchT();
      }}
      recargando={isRefetching}
    >
      <T v="titulo">Entradas</T>

      {(transferencias?.recibidas ?? []).map((t) => (
        <TransferenciaRecibida key={t.id} t={t} />
      ))}

      <View style={s.segmentos}>
        {(['proximas', 'pasadas'] as const).map((v) => (
          <Pulsable key={v} onPress={() => setVista(v)} style={[s.segmento, vista === v && s.segmentoActivo]} accessibilityState={{ selected: vista === v }} escala={0.98}>
            <T v="cuerpoFuerte" c={vista === v ? 'texto' : 'texto3'}>
              {v === 'proximas' ? `Próximas${grupos.proximas.length ? ` (${grupos.proximas.length})` : ''}` : 'Pasadas'}
            </T>
          </Pulsable>
        ))}
      </View>

      {error ? (
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      ) : isPending ? (
        <View style={{ gap: espacio.l }}>
          <Esqueleto alto={230} r={radio.xl} />
          <Esqueleto alto={230} r={radio.xl} />
        </View>
      ) : lista.length === 0 ? (
        <Vacio
          icono={vista === 'proximas' ? 'ticket-outline' : 'time-outline'}
          titulo={vista === 'proximas' ? 'Aún no tienes planes' : 'Sin eventos pasados'}
          texto={vista === 'proximas' ? 'Cuando compres entradas aparecerán aquí, listas para enseñar en la puerta.' : 'Aquí verás los eventos a los que ya has ido.'}
          accion={vista === 'proximas' ? <Boton icono="compass" onPress={() => navigation.navigate('Explorar')}>Explorar eventos</Boton> : undefined}
        />
      ) : (
        <View style={{ gap: espacio.l }}>
          {lista.map((g) => (
            <BilleteEvento key={g[0]!.evento.id} entradas={g} onPress={() => navigation.navigate('Entrada', { id: (g.find((e) => e.estado === 'valida') ?? g[0]!).id })} />
          ))}
        </View>
      )}
    </Pantalla>
  );
}

function TransferenciaRecibida({ t }: { t: Transferencia }) {
  const qc = useQueryClient();
  const avisar = useAviso();
  const [ocupado, setOcupado] = useState<'aceptar' | 'rechazar' | null>(null);
  async function resolver(accion: 'aceptar' | 'rechazar') {
    setOcupado(accion);
    try {
      await api(`/transferencias/${t.id}/${accion}`, { method: 'POST' });
      avisar(accion === 'aceptar' ? '¡Entrada añadida a tu cartera!' : 'Transferencia rechazada', accion === 'aceptar' ? 'exito' : 'info');
      await invalidarYo(qc);
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setOcupado(null);
    }
  }
  return (
    <View style={s.transferencia}>
      <Fila gap={espacio.m}>
        <View style={s.transferenciaIcono}>
          <Icono n="gift" c={color.acento} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="cuerpoFuerte">{t.de.nombre || t.de.email} te envía una entrada</T>
          <T v="nota" c="texto2" numberOfLines={1}>
            {t.entrada.evento.titulo} · {t.entrada.tramo.nombre}
          </T>
        </View>
      </Fila>
      <Fila gap={espacio.s} style={{ marginTop: espacio.m }}>
        <Boton v="secundario" pequeno onPress={() => void resolver('rechazar')} cargando={ocupado === 'rechazar'} style={{ flex: 1 }}>
          Rechazar
        </Boton>
        <Boton pequeno onPress={() => void resolver('aceptar')} cargando={ocupado === 'aceptar'} style={{ flex: 1 }}>
          Aceptar
        </Boton>
      </Fila>
    </View>
  );
}

const s = StyleSheet.create({
  segmentos: { flexDirection: 'row', padding: 4, marginVertical: espacio.xl, borderRadius: radio.l, backgroundColor: color.superficie },
  segmento: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radio.m },
  segmentoActivo: { backgroundColor: color.superficie3 },
  transferencia: { marginTop: espacio.l, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.acentoSuave, borderWidth: 1, borderColor: 'rgba(0,255,135,0.35)' },
  transferenciaIcono: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,255,135,0.18)', alignItems: 'center', justifyContent: 'center' },
});
