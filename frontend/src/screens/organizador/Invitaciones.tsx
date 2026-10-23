import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Chip, Fila, Icono, T } from '../../components/base';
import { Esqueleto, Vacio } from '../../components/estados';
import { Campo, Contador } from '../../components/formulario';
import { Cabecera, Pantalla, TituloSeccion } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { useEventoGestion } from '../../lib/consultas';
import { haceCuanto } from '../../lib/formato';
import { haptica } from '../../lib/haptica';
import type { PropsPantalla } from '../../navigation/tipos';
import { color, espacio, radio } from '../../theme';
import { BarraProgreso } from './Organizador';

interface Invitacion {
  id: string;
  creado_en: string;
  usuario: { nombre: string; email: string };
  entradas: { id: string; estado: string; es_acompanante: boolean }[];
}

/** Invitaciones (comps): entradas gratis dentro de un cupo, directas a la app del invitado. */
export function InvitacionesScreen({ route }: PropsPantalla<'Invitaciones'>) {
  const { eventoId } = route.params;
  const { data: evento } = useEventoGestion(eventoId);
  const lista = useQuery({
    queryKey: ['yo', 'invitaciones', eventoId],
    queryFn: () => api<{ cupo: number; usadas: number; invitaciones: Invitacion[] }>(`/organizador/eventos/${eventoId}/invitaciones`),
  });
  const avisar = useAviso();
  const [email, setEmail] = useState('');
  const [tramoId, setTramoId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cupo = lista.data?.cupo ?? 0;
  const usadas = lista.data?.usadas ?? 0;
  const libres = Math.max(cupo - usadas, 0);
  const tramos = (evento?.tramos ?? []).filter((t) => t.activo);
  const elegido = tramoId ?? tramos[0]?.id ?? null;

  async function invitar() {
    if (!elegido) return;
    setEnviando(true);
    try {
      await api(`/organizador/eventos/${eventoId}/invitaciones`, {
        method: 'POST',
        body: { email: email.trim(), items: [{ tramoId: elegido, cantidad }], nota: nota.trim() || undefined },
      });
      haptica.exito();
      avisar('Invitación enviada: ya la tiene en su app', 'exito');
      setEmail('');
      setNota('');
      setCantidad(1);
      await lista.refetch();
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla
      cabecera={<Cabecera titulo="Invitaciones" />}
      pie={
        <Boton icono="gift" deshabilitado={!/^\S+@\S+\.\S+$/.test(email.trim()) || !elegido || cantidad > libres} cargando={enviando} onPress={() => void invitar()}>
          {cantidad > libres ? 'Sin cupo suficiente' : `Invitar (${cantidad})`}
        </Boton>
      }
    >
      {lista.isPending ? (
        <Esqueleto alto={120} r={radio.l} />
      ) : (
        <View style={s.tarjeta}>
          <Fila style={{ justifyContent: 'space-between', marginBottom: espacio.m }}>
            <T v="cuerpoFuerte">Cupo del evento</T>
            <T v="cuerpoFuerte" c={libres ? 'acento' : 'peligro'}>
              {usadas} / {cupo}
            </T>
          </Fila>
          <BarraProgreso valor={usadas} total={Math.max(cupo, 1)} />
          <T v="nota" c="texto3" style={{ marginTop: espacio.s }}>
            {cupo === 0 ? 'Este evento no tiene cupo de invitaciones. Puedes fijarlo al editar el evento.' : `Te quedan ${libres} invitaciones. Son gratis y no generan gastos.`}
          </T>
        </View>
      )}

      <TituloSeccion titulo="Nueva invitación" />
      <View style={{ gap: espacio.m }}>
        <Campo etiqueta="Email del invitado" value={email} onChangeText={setEmail} placeholder="Debe tener cuenta en la app" keyboardType="email-address" autoCapitalize="none" icono="mail-outline" />
        <Fila gap={espacio.s} style={{ flexWrap: 'wrap' }}>
          {tramos.map((t) => (
            <Chip key={t.id} texto={t.nombre} activo={elegido === t.id} onPress={() => setTramoId(t.id)} />
          ))}
        </Fila>
        <Fila style={{ justifyContent: 'space-between' }}>
          <T c="texto2">Entradas</T>
          <Contador valor={cantidad} min={1} max={Math.max(1, Math.min(libres, 10))} onCambio={setCantidad} />
        </Fila>
        <Campo etiqueta="Mensaje (opcional)" value={nota} onChangeText={setNota} placeholder="¡Gracias por apoyarnos!" />
      </View>

      <TituloSeccion titulo="Enviadas" />
      {lista.data?.invitaciones.length ? (
        <View style={{ gap: espacio.s }}>
          {lista.data.invitaciones.map((i) => (
            <Fila key={i.id} gap={espacio.m} style={s.tarjeta}>
              <Icono n="gift-outline" c={color.acento} />
              <View style={{ flex: 1 }}>
                <T v="cuerpoFuerte">{i.usuario.nombre || i.usuario.email}</T>
                <T v="nota" c="texto2">
                  {i.entradas.filter((e) => !e.es_acompanante).length} entradas · {haceCuanto(i.creado_en)}
                  {i.entradas.some((e) => e.estado === 'usada') ? ' · ya ha entrado' : ''}
                </T>
              </View>
            </Fila>
          ))}
        </View>
      ) : (
        <Vacio icono="gift-outline" titulo="Aún no has invitado a nadie" texto="Prensa, artistas, patrocinadores… Las invitaciones llegan al momento a su app." />
      )}
    </Pantalla>
  );
}

const s = StyleSheet.create({
  tarjeta: { padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
});
