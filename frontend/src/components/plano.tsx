import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { api, mensajeDe } from '../lib/api';
import { haptica } from '../lib/haptica';
import { useT } from '../lib/i18n';
import type { Asiento } from '../lib/tipos';
import { color, espacio, radio } from '../theme';
import { Boton, Fila, Pulsable, T } from './base';
import { Esqueleto } from './estados';
import { Contador } from './formulario';

export type Butaca = Pick<Asiento, 'id' | 'seccion' | 'fila' | 'numero'>;

export const useAsientos = (eventoId: string, tramoId: string) =>
  useQuery({
    queryKey: ['asientos', eventoId, tramoId],
    queryFn: () => api<{ asientos: Asiento[] }>(`/eventos/${eventoId}/tramos/${tramoId}/asientos`).then((r) => r.asientos),
    refetchInterval: 20_000,
  });

/** «Fila A · 4, 5, 6» agrupado por fila. */
export function describirButacas(butacas: Butaca[], t: (s: string) => string = (s) => s): string {
  const filas = new Map<string, number[]>();
  for (const b of butacas) {
    const clave = `${b.seccion ? `${b.seccion} · ` : ''}${t('Fila')} ${b.fila}`;
    filas.set(clave, [...(filas.get(clave) ?? []), b.numero]);
  }
  return [...filas].map(([f, ns]) => `${f} · ${ns.sort((a, b) => a - b).join(', ')}`).join(' — ');
}

/**
 * Plano de butacas de un tipo de entrada numerado. Se tocan las butacas o se
 * pide el «mejor sitio»: las mejores juntas, delante y centradas.
 */
export function PlanoAsientos({
  eventoId,
  tramoId,
  max,
  elegidas,
  onCambio,
}: {
  eventoId: string;
  tramoId: string;
  max: number;
  elegidas: Butaca[];
  onCambio: (b: Butaca[]) => void;
}) {
  const { t } = useT();
  const { data: asientos, isPending, error } = useAsientos(eventoId, tramoId);
  const [ancho, setAncho] = useState(0);
  const [n, setN] = useState(Math.min(2, max));
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const filas = useMemo(() => {
    const m = new Map<string, Asiento[]>();
    for (const a of asientos ?? []) {
      const k = `${a.seccion}|${a.orden_fila}`;
      m.set(k, [...(m.get(k) ?? []), a]);
    }
    return [...m.values()];
  }, [asientos]);
  const porFila = Math.max(1, ...filas.map((f) => f.length));
  // Butacas tan grandes como quepan (máx. 30 px), con hueco para la letra de fila (20 px + 4 de separación).
  const lado = ancho ? Math.max(6, Math.min(30, Math.floor((ancho - 24) / porFila) - 4)) : 0;
  const elegidasIds = new Set(elegidas.map((b) => b.id));

  function tocar(a: Asiento) {
    if (a.estado !== 'libre') return;
    setAviso(null);
    if (elegidasIds.has(a.id)) {
      haptica.toque();
      onCambio(elegidas.filter((b) => b.id !== a.id));
    } else if (elegidas.length >= max) {
      haptica.error();
      setAviso(t('Máximo {n} butacas por compra', { n: max }));
    } else {
      haptica.toque();
      onCambio([...elegidas, a]);
    }
  }

  async function mejorSitio() {
    setBuscando(true);
    setAviso(null);
    try {
      const r = await api<{ asientos: Butaca[] }>(`/eventos/${eventoId}/tramos/${tramoId}/mejores`, { query: { n } });
      haptica.exito();
      onCambio(r.asientos);
    } catch (e) {
      haptica.error();
      setAviso(mensajeDe(e));
    } finally {
      setBuscando(false);
    }
  }

  if (error) return <T c="peligro">{mensajeDe(error)}</T>;

  return (
    <View style={{ gap: espacio.m }} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      <View style={s.escenario}>
        <T v="nota" c="texto2" style={{ letterSpacing: 3, fontWeight: '700' }}>
          {t('ESCENARIO')}
        </T>
      </View>
      {isPending || !lado ? (
        <Esqueleto alto={160} r={radio.m} />
      ) : (
        <ScrollView horizontal={false} style={{ maxHeight: 360 }} nestedScrollEnabled>
          <View style={{ gap: 4, alignItems: 'center' }}>
            {filas.map((fila) => (
              <View key={`${fila[0]!.seccion}${fila[0]!.fila}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <T v="nota" c="texto3" style={{ width: 20, textAlign: 'center', fontWeight: '700' }}>
                  {fila[0]!.fila}
                </T>
                {fila.map((a) => {
                  const mia = elegidasIds.has(a.id);
                  const libre = a.estado === 'libre';
                  return (
                    <Pulsable
                      key={a.id}
                      onPress={() => tocar(a)}
                      disabled={!libre}
                      escala={0.85}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: mia, disabled: !libre }}
                      accessibilityLabel={`${t('Fila')} ${a.fila}, ${t('butaca')} ${a.numero}${libre ? '' : `, ${t('ocupada')}`}`}
                      style={[
                        s.butaca,
                        { width: lado, height: lado, borderRadius: Math.max(3, lado / 4) },
                        !libre && s.ocupada,
                        mia && s.mia,
                      ]}
                    >
                      {mia && lado >= 18 ? (
                        <T v="nota" style={{ fontSize: 10, fontWeight: '800', color: color.acentoTexto }}>
                          {a.numero}
                        </T>
                      ) : null}
                    </Pulsable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Fila gap={espacio.l} style={{ justifyContent: 'center' }}>
        <Leyenda estilo={s.butaca} texto={t('Libre')} />
        <Leyenda estilo={[s.butaca, s.mia]} texto={t('Tuya')} />
        <Leyenda estilo={[s.butaca, s.ocupada]} texto={t('Ocupada')} />
      </Fila>

      <View style={s.mejor}>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="cuerpoFuerte">{t('Mejor sitio disponible')}</T>
          <T v="nota" c="texto2">
            {t('Juntas, lo más cerca y centradas posible')}
          </T>
        </View>
        <Contador valor={n} min={1} max={max} onCambio={setN} />
      </View>
      <Boton v="secundario" pequeno icono="sparkles" cargando={buscando} onPress={() => void mejorSitio()}>
        {t('Buscar las mejores {n}', { n })}
      </Boton>
      {aviso && (
        <T v="nota" c="peligro">
          {aviso}
        </T>
      )}
      {elegidas.length > 0 && (
        <T v="nota" c="acento" style={{ fontWeight: '700' }}>
          {describirButacas(elegidas, t)}
        </T>
      )}
    </View>
  );
}

function Leyenda({ estilo, texto }: { estilo: object; texto: string }) {
  return (
    <Fila gap={6}>
      <View style={[estilo, { width: 14, height: 14, borderRadius: 4 }]} />
      <T v="nota" c="texto2">
        {texto}
      </T>
    </Fila>
  );
}

const s = StyleSheet.create({
  escenario: { alignSelf: 'center', width: '70%', paddingVertical: 6, alignItems: 'center', borderRadius: radio.total, backgroundColor: color.superficie2, borderWidth: 1, borderColor: color.borde },
  butaca: { backgroundColor: color.superficie3, borderWidth: 1, borderColor: color.bordeFuerte, alignItems: 'center', justifyContent: 'center' },
  ocupada: { backgroundColor: 'transparent', borderColor: color.borde, opacity: 0.5 },
  mia: { backgroundColor: color.acento, borderColor: color.acento },
  mejor: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, padding: espacio.m, borderRadius: radio.m, backgroundColor: color.superficie2 },
});
