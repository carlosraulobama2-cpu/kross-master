import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Fila, Icono, Insignia, Pulsable, T } from '../../components/base';
import { ErrorEstado, Esqueleto, Vacio } from '../../components/estados';
import { ImagenEvento } from '../../components/evento';
import { Cabecera, Pantalla, TituloSeccion } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useMisEventos } from '../../lib/consultas';
import { cuandoEs, precio } from '../../lib/formato';
import type { EstadoEvento, EventoOrganizador } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

export const ESTADO_EVENTO: Record<EstadoEvento, { texto: string; tono: 'acento' | 'neutro' | 'peligro' | 'info' }> = {
  publicado: { texto: 'A la venta', tono: 'acento' },
  borrador: { texto: 'Borrador', tono: 'neutro' },
  cancelado: { texto: 'Cancelado', tono: 'peligro' },
  finalizado: { texto: 'Finalizado', tono: 'info' },
};

export function Kpi({ etiqueta, valor, icono }: { etiqueta: string; valor: string; icono: 'ticket' | 'cash' | 'calendar' | 'checkmark-done' | 'people' }) {
  return (
    <View style={s.kpi}>
      <Icono n={icono} tam={18} c={color.acento} />
      <T v="cifra" numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </T>
      <T v="nota" c="texto2">
        {etiqueta}
      </T>
    </View>
  );
}

export function BarraProgreso({ valor, total }: { valor: number; total: number }) {
  const pct = total > 0 ? Math.min(1, valor / total) : 0;
  return (
    <View style={s.barra}>
      <View style={[s.barraRelleno, { width: `${pct * 100}%` }]} />
    </View>
  );
}

function FilaEventoOrg({ e, onPress }: { e: EventoOrganizador; onPress: () => void }) {
  const estado = ESTADO_EVENTO[e.estado];
  return (
    <Pulsable onPress={onPress} style={s.fila} escala={0.98}>
      <ImagenEvento uri={e.imagen_url} categoria={e.categoria} style={{ width: 64, height: 64 }} r={radio.m} />
      <View style={{ flex: 1, gap: 4 }}>
        <Fila style={{ justifyContent: 'space-between' }}>
          <T v="cuerpoFuerte" numberOfLines={1} style={{ flex: 1, fontWeight: '700' }}>
            {e.titulo}
          </T>
        </Fila>
        <T v="nota" c="texto2" numberOfLines={1}>
          {cuandoEs(e.inicia_en)} · {e.ciudad}
        </T>
        <Fila gap={espacio.s}>
          <View style={{ flex: 1 }}>
            <BarraProgreso valor={e.vendidas} total={e.aforo} />
          </View>
          <T v="nota" c="texto2" style={{ fontVariant: ['tabular-nums'] }}>
            {e.vendidas}/{e.aforo}
          </T>
        </Fila>
      </View>
      <Insignia texto={estado.texto} tono={estado.tono} />
    </Pulsable>
  );
}

export function OrganizadorScreen({ navigation }: PropsPantalla<'Organizador'>) {
  const { usuario, refrescar } = useAuth();
  const { data, error, isPending, refetch, isRefetching } = useMisEventos();
  const avisar = useAviso();
  const [conectando, setConectando] = useState(false);

  const activos = data?.filter((e) => e.estado === 'publicado') ?? [];
  const borradores = data?.filter((e) => e.estado === 'borrador') ?? [];
  const pasados = data?.filter((e) => e.estado === 'finalizado' || e.estado === 'cancelado') ?? [];
  const vendidas = data?.reduce((a, e) => a + e.vendidas, 0) ?? 0;
  const ingresos = data?.reduce((a, e) => a + e.ingresos_centimos, 0) ?? 0;

  async function conectarStripe() {
    setConectando(true);
    try {
      const volverA = Platform.OS === 'web' ? window.location.href : 'https://kroosmaster.app/stripe-vuelta';
      const { url } = await api<{ url: string }>('/me/stripe/onboarding', { method: 'POST', body: { volverA } });
      await WebBrowser.openBrowserAsync(url);
      await api('/me/stripe/estado');
      await refrescar();
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setConectando(false);
    }
  }

  const seccion = (titulo: string, lista: EventoOrganizador[]) =>
    lista.length > 0 && (
      <>
        <TituloSeccion titulo={titulo} />
        <View style={{ gap: espacio.s }}>
          {lista.map((e) => (
            <FilaEventoOrg key={e.id} e={e} onPress={() => navigation.navigate('GestionEvento', { id: e.id })} />
          ))}
        </View>
      </>
    );

  return (
    <Pantalla
      cabecera={<Cabecera titulo={usuario?.nombre_artistico || 'Mis eventos'} />}
      recargar={() => void refetch()}
      recargando={isRefetching}
      pie={
        <Boton icono="add" onPress={() => navigation.navigate('EventoForm')}>
          Crear evento
        </Boton>
      }
    >
      <Fila gap={espacio.s}>
        <Kpi etiqueta="Entradas vendidas" valor={vendidas.toLocaleString('es-ES')} icono="ticket" />
        <Kpi etiqueta="Ingresos" valor={precio(ingresos).replace('Gratis', '0 €')} icono="cash" />
      </Fila>

      {usuario && !usuario.stripe_onboarding_completo && (
        <View style={s.stripe}>
          <Fila gap={espacio.m} style={{ alignItems: 'flex-start' }}>
            <Icono n="card" c={color.aviso} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="cuerpoFuerte">Conecta tus cobros</T>
              <T v="nota" c="texto2">
                Vincula una cuenta de Stripe para recibir el dinero de cada venta directamente en tu banco.
              </T>
            </View>
          </Fila>
          <Boton v="secundario" pequeno cargando={conectando} onPress={() => void conectarStripe()} style={{ marginTop: espacio.m }}>
            Conectar con Stripe
          </Boton>
        </View>
      )}

      {error ? (
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      ) : isPending ? (
        <View style={{ gap: espacio.s, marginTop: espacio.xxl }}>
          {[0, 1, 2].map((i) => (
            <Esqueleto key={i} alto={92} r={radio.l} />
          ))}
        </View>
      ) : data.length === 0 ? (
        <Vacio icono="sparkles-outline" titulo="Tu primer evento te espera" texto="Créalo en un par de minutos. Puedes guardarlo como borrador y publicarlo cuando quieras." />
      ) : (
        <>
          {seccion('A la venta', activos)}
          {seccion('Borradores', borradores)}
          {seccion('Pasados', pasados)}
        </>
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  kpi: { flex: 1, gap: 4, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  barra: { height: 6, borderRadius: 3, backgroundColor: color.superficie3, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: 3, backgroundColor: color.acento },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.m, padding: espacio.m, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  stripe: { marginTop: espacio.l, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.avisoSuave, borderWidth: 1, borderColor: 'rgba(255,201,60,0.35)' },
});
