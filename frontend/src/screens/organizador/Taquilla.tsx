import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Chip, Fila, Icono, Insignia, T } from '../../components/base';
import { ErrorEstado, Esqueleto } from '../../components/estados';
import { Campo, Contador } from '../../components/formulario';
import { Cabecera, Pantalla, TituloSeccion } from '../../components/pantalla';
import { describirButacas } from '../../components/plano';
import { api, mensajeDe } from '../../lib/api';
import { invalidarYo, useEventoGestion } from '../../lib/consultas';
import { precio, precioExacto } from '../../lib/formato';
import { haptica } from '../../lib/haptica';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';

type Metodo = 'efectivo' | 'tarjeta' | 'bizum';
const METODOS: { id: Metodo; texto: string; icono: 'cash-outline' | 'card-outline' | 'phone-portrait-outline' }[] = [
  { id: 'efectivo', texto: 'Efectivo', icono: 'cash-outline' },
  { id: 'tarjeta', texto: 'Datáfono', icono: 'card-outline' },
  { id: 'bizum', texto: 'Bizum', icono: 'phone-portrait-outline' },
];

interface Vendida {
  pedidoId: string;
  total_centimos: number;
  enCuentaDe: 'comprador' | 'vendedor';
  entradas: { id: string; codigo: string; estado: string; tramo: { nombre: string }; asiento: { fila: string; numero: number } | null }[];
}

/** Venta en taquilla desde el móvil: sin gastos de gestión, cobro en mano. */
export function TaquillaScreen({ route }: PropsPantalla<'Taquilla'>) {
  const { eventoId } = route.params;
  const { data: evento, error, refetch } = useEventoGestion(eventoId);
  const qc = useQueryClient();
  const avisar = useAviso();
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [metodo, setMetodo] = useState<Metodo>('efectivo');
  const [titular, setTitular] = useState('');
  const [email, setEmail] = useState('');
  const [validarYa, setValidarYa] = useState(false);
  const [vendiendo, setVendiendo] = useState(false);
  const [ultima, setUltima] = useState<Vendida | null>(null);

  if (error) return <ErrorEstado error={error} reintentar={() => void refetch()} />;
  const tramos = (evento?.tramos ?? []).filter((t) => t.activo && t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada > 0);
  const items = Object.entries(cantidades).filter(([, n]) => n > 0);
  const total = items.reduce((a, [tid, n]) => a + n * (evento?.tramos.find((t) => t.id === tid)?.precio_centimos ?? 0), 0);
  const emailOk = !email.trim() || /^\S+@\S+\.\S+$/.test(email.trim());

  async function vender() {
    setVendiendo(true);
    try {
      const r = await api<Vendida>(`/organizador/eventos/${eventoId}/taquilla`, {
        method: 'POST',
        body: {
          items: items.map(([tramoId, cantidad]) => ({ tramoId, cantidad })),
          metodoPago: metodo,
          titular: titular.trim() || undefined,
          email: email.trim() || undefined,
          validarYa,
        },
      });
      haptica.exito();
      setUltima(r);
      setCantidades({});
      setTitular('');
      setEmail('');
      await invalidarYo(qc);
    } catch (e) {
      haptica.error();
      avisar(mensajeDe(e), 'error');
    } finally {
      setVendiendo(false);
    }
  }

  return (
    <Pantalla
      cabecera={<Cabecera titulo="Taquilla" />}
      pie={
        <Boton icono="checkmark-circle" deshabilitado={!items.length || !emailOk} cargando={vendiendo} onPress={() => void vender()}>
          {items.length ? `Cobrar ${precioExacto(total)}` : 'Elige entradas'}
        </Boton>
      }
    >
      {!evento ? (
        <Esqueleto alto={200} r={radio.l} />
      ) : (
        <>
          <T v="subtitulo">{evento.titulo}</T>
          <T v="nota" c="texto2">
            Sin gastos de gestión. Se emiten al momento.
          </T>

          {ultima && (
            <View style={[s.tarjeta, { borderColor: color.acento, marginTop: espacio.l, gap: espacio.s }]}>
              <Fila gap={espacio.s}>
                <Icono n="checkmark-circle" c={color.acento} />
                <T v="cuerpoFuerte" style={{ flex: 1 }}>
                  Venta hecha · {precioExacto(ultima.total_centimos)}
                </T>
                {ultima.entradas.every((e) => e.estado === 'usada') && <Insignia texto="Ya dentro" tono="acento" />}
              </Fila>
              {ultima.entradas.map((e) => (
                <Fila key={e.id} style={{ justifyContent: 'space-between' }}>
                  <T c="texto2">
                    {e.tramo.nombre}
                    {e.asiento ? ` · ${describirButacas([{ id: e.id, seccion: '', ...e.asiento }])}` : ''}
                  </T>
                  <T v="cuerpoFuerte" style={{ letterSpacing: 1.5 }}>
                    {e.codigo}
                  </T>
                </Fila>
              ))}
              <T v="nota" c="texto3">
                {ultima.enCuentaDe === 'comprador' ? 'Las entradas ya están en la app del comprador.' : 'Apunta los códigos: el portero puede introducirlos a mano.'}
              </T>
            </View>
          )}

          <TituloSeccion titulo="Entradas" />
          <View style={{ gap: espacio.s }}>
            {tramos.length === 0 && <T c="texto2">No quedan entradas a la venta.</T>}
            {tramos.map((t) => {
              const quedan = t.cantidad_total - t.cantidad_vendida - t.cantidad_reservada;
              return (
                <Fila key={t.id} gap={espacio.m} style={[s.tarjeta, (cantidades[t.id] ?? 0) > 0 && { borderColor: color.acento }]}>
                  <View style={{ flex: 1 }}>
                    <T v="cuerpoFuerte">{t.nombre}</T>
                    <T v="nota" c="texto2">
                      {precio(t.precio_centimos)} · quedan {quedan}
                      {t.numerado ? ' · butaca automática' : ''}
                    </T>
                  </View>
                  <Contador valor={cantidades[t.id] ?? 0} max={Math.min(quedan, 50)} onCambio={(n) => setCantidades((c) => ({ ...c, [t.id]: n }))} />
                </Fila>
              );
            })}
          </View>

          <TituloSeccion titulo="Cobro" />
          <Fila gap={espacio.s} style={{ flexWrap: 'wrap' }}>
            {METODOS.map((m) => (
              <Chip key={m.id} texto={m.texto} icono={m.icono} activo={metodo === m.id} onPress={() => setMetodo(m.id)} />
            ))}
          </Fila>

          <View style={{ gap: espacio.m, marginTop: espacio.l }}>
            <Campo etiqueta="Nombre del titular (opcional)" value={titular} onChangeText={setTitular} placeholder="Para la lista de asistentes" icono="person-outline" />
            <Campo
              etiqueta="Email del comprador (opcional)"
              value={email}
              onChangeText={setEmail}
              placeholder="Si tiene cuenta, las recibe en su app"
              keyboardType="email-address"
              autoCapitalize="none"
              icono="mail-outline"
              error={emailOk ? null : 'Email no válido'}
            />
            <Fila gap={espacio.m} style={s.tarjeta}>
              <Icono n="enter-outline" c={color.texto2} />
              <View style={{ flex: 1 }}>
                <T v="cuerpoFuerte">Validar ya (entra ahora)</T>
                <T v="nota" c="texto2">
                  Marca las entradas como usadas al venderlas en la puerta.
                </T>
              </View>
              <Switch value={validarYa} onValueChange={setValidarYa} trackColor={{ true: color.acento, false: color.superficie3 }} thumbColor={color.blanco} />
            </Fila>
          </View>
        </>
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  tarjeta: { padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
});
