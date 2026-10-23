import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Modal, Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAviso } from '../../components/aviso';
import { Boton, BotonIcono, Fila, Icono, Insignia, Pulsable, T, type NombreIcono } from '../../components/base';
import { ErrorEstado, Esqueleto } from '../../components/estados';
import { ImagenEvento } from '../../components/evento';
import { Campo } from '../../components/formulario';
import { Cabecera, Pantalla, TituloSeccion } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { invalidarYo, useEventoGestion } from '../../lib/consultas';
import { cuandoEs, precio } from '../../lib/formato';
import type { EstadisticasEvento } from '../../lib/tipos';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';
import { BarraProgreso, ESTADO_EVENTO, Kpi } from './Organizador';

/** Barras de ventas de los últimos 14 días. */
function GraficaVentas({ serie }: { serie: EstadisticasEvento['serie'] }) {
  const dias = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    const clave = d.toISOString().slice(0, 10);
    return { clave, entradas: serie.find((x) => x.dia === clave)?.entradas ?? 0, etiqueta: d.getDate() };
  });
  const max = Math.max(1, ...dias.map((d) => d.entradas));
  return (
    <View style={s.tarjeta}>
      <Fila style={{ justifyContent: 'space-between', marginBottom: espacio.l }}>
        <T v="cuerpoFuerte">Ventas · últimos 14 días</T>
        <T v="nota" c="texto2">
          {dias.reduce((a, d) => a + d.entradas, 0)} entradas
        </T>
      </Fila>
      <Fila gap={4} style={{ alignItems: 'flex-end', height: 96 }}>
        {dias.map((d) => (
          <View key={d.clave} style={{ flex: 1, alignItems: 'center', gap: 4 }} accessibilityLabel={`Día ${d.etiqueta}: ${d.entradas} entradas`}>
            <View style={{ width: '100%', height: Math.max(3, (d.entradas / max) * 80), borderRadius: 4, backgroundColor: d.entradas ? color.acento : color.superficie3 }} />
            <T v="nota" c="texto3" style={{ fontSize: 10 }}>
              {d.etiqueta}
            </T>
          </View>
        ))}
      </Fila>
    </View>
  );
}

function Accion({ icono, texto, onPress }: { icono: NombreIcono; texto: string; onPress: () => void }) {
  return (
    <Pulsable onPress={onPress} style={s.accion}>
      <View style={s.accionIcono}>
        <Icono n={icono} c={color.texto} />
      </View>
      <T v="nota" c="texto2" centro numberOfLines={1}>
        {texto}
      </T>
    </Pulsable>
  );
}

interface MiembroStaff {
  usuario: { id: string; nombre: string; email: string };
}

export function GestionEventoScreen({ navigation, route }: PropsPantalla<'GestionEvento'>) {
  const { id } = route.params;
  const { data: evento, error, refetch, isRefetching } = useEventoGestion(id);
  const staff = useQuery({ queryKey: ['yo', 'staff', id], queryFn: () => api<{ staff: MiembroStaff[] }>(`/organizador/eventos/${id}/staff`).then((r) => r.staff) });
  const qc = useQueryClient();
  const avisar = useAviso();
  const insets = useSafeAreaInsets();
  const [emailStaff, setEmailStaff] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');

  async function ejecutar(clave: string, fn: () => Promise<unknown>, exito: string) {
    setOcupado(clave);
    try {
      await fn();
      avisar(exito, 'exito');
      await invalidarYo(qc);
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setOcupado(null);
    }
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: color.fondo }}>
        <Cabecera />
        <ErrorEstado error={error} reintentar={() => void refetch()} />
      </View>
    );
  }
  if (!evento) {
    return (
      <Pantalla cabecera={<Cabecera />}>
        <Esqueleto alto={180} r={radio.xl} />
        <Fila gap={espacio.s} style={{ marginTop: espacio.l }}>
          <Esqueleto alto={96} r={radio.l} style={{ flex: 1 }} />
          <Esqueleto alto={96} r={radio.l} style={{ flex: 1 }} />
        </Fila>
      </Pantalla>
    );
  }

  const st = evento.estadisticas;
  const estado = ESTADO_EVENTO[evento.estado];
  const abierto = evento.estado === 'borrador' || evento.estado === 'publicado';

  return (
    <Pantalla
      cabecera={<Cabecera titulo="Gestionar evento" derecha={abierto ? <BotonIcono n="create-outline" etiqueta="Editar" onPress={() => navigation.navigate('EventoForm', { id })} /> : undefined} />}
      recargar={() => void refetch()}
      recargando={isRefetching}
      pie={
        evento.estado === 'borrador' ? (
          <Boton icono="rocket" cargando={ocupado === 'publicar'} onPress={() => void ejecutar('publicar', () => api(`/organizador/eventos/${id}/publicar`, { method: 'POST' }), '¡Evento publicado!')}>
            Publicar evento
          </Boton>
        ) : evento.estado === 'publicado' ? (
          <Boton icono="scan" onPress={() => navigation.navigate('Escaner', { eventoId: id, titulo: evento.titulo })}>
            Escanear entradas
          </Boton>
        ) : undefined
      }
    >
      <View>
        <ImagenEvento uri={evento.imagen_url} categoria={evento.categoria} style={{ height: 160 }} r={radio.xl} />
        <View style={{ position: 'absolute', top: espacio.m, left: espacio.m }}>
          <Insignia texto={estado.texto} tono={estado.tono} />
        </View>
      </View>
      <T v="titulo" style={{ marginTop: espacio.l }}>
        {evento.titulo}
      </T>
      <T c="texto2">
        {cuandoEs(evento.inicia_en)} · {evento.recinto}, {evento.ciudad}
      </T>

      <Fila gap={espacio.s} style={{ marginTop: espacio.xl }}>
        <Kpi etiqueta={`de ${st.aforo.toLocaleString('es-ES')} vendidas`} valor={st.vendidas.toLocaleString('es-ES')} icono="ticket" />
        <Kpi etiqueta="Ingresos" valor={precio(st.ingresos_centimos).replace('Gratis', '0 €')} icono="cash" />
      </Fila>
      <Fila gap={espacio.s} style={{ marginTop: espacio.s }}>
        <Kpi etiqueta="Han entrado" valor={st.validadas.toLocaleString('es-ES')} icono="checkmark-done" />
        <Kpi etiqueta="Pedidos" valor={st.pedidos.toLocaleString('es-ES')} icono="people" />
      </Fila>

      <View style={{ marginTop: espacio.l }}>
        <GraficaVentas serie={st.serie} />
      </View>

      <Fila gap={espacio.s} style={{ marginTop: espacio.l }}>
        {evento.estado === 'publicado' && <Accion icono="eye-outline" texto="Ver ficha" onPress={() => navigation.navigate('Evento', { id })} />}
        <Accion
          icono="share-social-outline"
          texto="Compartir"
          onPress={() => void Share.share({ message: `${evento.titulo} · entradas en https://kroosmaster.app/evento/${id}` }).catch(() => undefined)}
        />
        {abierto && <Accion icono="create-outline" texto="Editar" onPress={() => navigation.navigate('EventoForm', { id })} />}
        {abierto && <Accion icono="close-circle-outline" texto="Cancelar" onPress={() => setCancelando(true)} />}
      </Fila>

      <TituloSeccion titulo="Tipos de entrada" />
      <View style={{ gap: espacio.s }}>
        {evento.tramos.map((t) => (
          <View key={t.id} style={[s.tarjeta, !t.activo && { opacity: 0.55 }]}>
            <Fila style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T v="cuerpoFuerte">{t.nombre}</T>
                <T v="nota" c="texto2">
                  {precio(t.precio_centimos)} · {t.cantidad_vendida}/{t.cantidad_total} vendidas{t.cantidad_reservada ? ` · ${t.cantidad_reservada} en pago` : ''}
                </T>
              </View>
              {abierto && (
                <Boton
                  v="secundario"
                  pequeno
                  bloque={false}
                  cargando={ocupado === t.id}
                  onPress={() =>
                    void ejecutar(t.id, () => api(`/organizador/eventos/${id}/tramos/${t.id}`, { method: 'PATCH', body: { activo: !t.activo } }), t.activo ? 'Venta pausada' : 'Venta reanudada')
                  }
                >
                  {t.activo ? 'Pausar' : 'Reanudar'}
                </Boton>
              )}
            </Fila>
            <View style={{ marginTop: espacio.m }}>
              <BarraProgreso valor={t.cantidad_vendida} total={t.cantidad_total} />
            </View>
          </View>
        ))}
      </View>

      <TituloSeccion titulo="Equipo de puerta" />
      <T v="nota" c="texto2" style={{ marginTop: -espacio.s, marginBottom: espacio.m }}>
        Estas personas podrán escanear entradas de este evento desde su móvil.
      </T>
      <View style={{ gap: espacio.s }}>
        {(staff.data ?? []).map((m) => (
          <Fila key={m.usuario.id} gap={espacio.m} style={s.tarjeta}>
            <View style={s.avatar}>
              <T v="cuerpoFuerte">{(m.usuario.nombre || m.usuario.email)[0]?.toUpperCase()}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T v="cuerpoFuerte">{m.usuario.nombre || 'Sin nombre'}</T>
              <T v="nota" c="texto2">
                {m.usuario.email}
              </T>
            </View>
            <BotonIcono
              n="person-remove-outline"
              etiqueta={`Quitar a ${m.usuario.email}`}
              c={color.peligro}
              fondo="transparent"
              onPress={() =>
                void ejecutar(`staff-${m.usuario.id}`, () => api(`/organizador/eventos/${id}/staff/${m.usuario.id}`, { method: 'DELETE' }), 'Persona eliminada del equipo').then(() =>
                  staff.refetch(),
                )
              }
            />
          </Fila>
        ))}
        <Fila gap={espacio.s} style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Campo etiqueta="Añadir por email" value={emailStaff} onChangeText={setEmailStaff} placeholder="portero@email.com" keyboardType="email-address" autoCapitalize="none" icono="person-add-outline" />
          </View>
          <Boton
            bloque={false}
            deshabilitado={!/^\S+@\S+\.\S+$/.test(emailStaff.trim())}
            cargando={ocupado === 'staff'}
            onPress={() =>
              void ejecutar('staff', () => api(`/organizador/eventos/${id}/staff`, { method: 'POST', body: { email: emailStaff.trim() } }), 'Añadido al equipo de puerta').then(() => {
                setEmailStaff('');
                void staff.refetch();
              })
            }
          >
            Añadir
          </Boton>
        </Fila>
      </View>

      <Modal visible={cancelando} transparent animationType="slide" onRequestClose={() => setCancelando(false)}>
        <Pressable style={{ flex: 1, backgroundColor: color.velo }} onPress={() => setCancelando(false)} />
        <View style={[s.hoja, { paddingBottom: insets.bottom + espacio.l }]}>
          <T v="subtitulo">¿Cancelar «{evento.titulo}»?</T>
          <T c="texto2">
            Se devolverá el dinero a los {st.vendidas.toLocaleString('es-ES')} asistentes y recibirán una notificación con el motivo. No se puede deshacer.
          </T>
          <Campo etiqueta="Motivo para los asistentes" value={motivo} onChangeText={setMotivo} multiline placeholder="Ej.: el artista está enfermo y no puede actuar" />
          <Boton
            v="peligro"
            deshabilitado={motivo.trim().length < 5}
            cargando={ocupado === 'cancelar'}
            onPress={() =>
              void ejecutar('cancelar', () => api(`/organizador/eventos/${id}/cancelar`, { method: 'POST', body: { motivo: motivo.trim() } }), 'Evento cancelado y reembolsado').then(() =>
                setCancelando(false),
              )
            }
          >
            Cancelar evento y reembolsar
          </Boton>
          <Boton v="fantasma" onPress={() => setCancelando(false)}>
            Volver
          </Boton>
        </View>
      </Modal>
    </Pantalla>
  );
}

const s = StyleSheet.create({
  tarjeta: { padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  accion: { flex: 1, alignItems: 'center', gap: 6 },
  accionIcono: { width: 52, height: 52, borderRadius: radio.l, backgroundColor: color.superficie2, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.superficie3, alignItems: 'center', justifyContent: 'center' },
  hoja: { gap: espacio.l, padding: espacio.xl, borderTopLeftRadius: radio.xxl, borderTopRightRadius: radio.xxl, backgroundColor: color.superficie },
});
