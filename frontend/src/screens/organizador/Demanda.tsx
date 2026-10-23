import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Fila, Icono, T } from '../../components/base';
import { Campo } from '../../components/formulario';
import { TituloSeccion } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { invalidarYo, useFansEvento } from '../../lib/consultas';
import type { EventoGestion } from '../../lib/tipos';
import { color, espacio, radio } from '../../theme';

/** Herramientas para lanzamientos con mucha demanda: cola virtual y sorteo de fans. */
export function Demanda({ evento, editable }: { evento: EventoGestion; editable: boolean }) {
  const qc = useQueryClient();
  const avisar = useAviso();
  const { data: fans } = useFansEvento(evento.id);
  const [ritmo, setRitmo] = useState(String(evento.cola_ritmo));
  const [plazas, setPlazas] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function guardar(clave: string, cambios: Record<string, unknown>, exito: string) {
    setOcupado(clave);
    try {
      await api(`/organizador/eventos/${evento.id}`, { method: 'PATCH', body: cambios });
      avisar(exito, 'exito');
      await invalidarYo(qc);
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setOcupado(null);
    }
  }

  async function sortear() {
    setOcupado('sorteo');
    try {
      const r = await api<{ seleccionados: number; no_seleccionados: number }>(`/organizador/eventos/${evento.id}/sorteo`, {
        method: 'POST',
        body: { plazas: Number.parseInt(plazas, 10) },
      });
      avisar(`Sorteo hecho: ${r.seleccionados} fans seleccionados`, 'exito');
      setPlazas('');
      await invalidarYo(qc);
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <TituloSeccion titulo="Lanzamiento con mucha demanda" />
      <View style={s.tarjeta}>
        <Fila gap={espacio.m}>
          <Icono n="people-outline" c={color.texto2} />
          <View style={{ flex: 1 }}>
            <T v="cuerpoFuerte">Cola virtual</T>
            <T v="nota" c="texto2">
              Los compradores esperan su turno y entran por orden de llegada.
            </T>
          </View>
          <Switch
            value={evento.cola_activa}
            disabled={!editable || ocupado !== null}
            onValueChange={(v) => void guardar('cola', { cola_activa: v }, v ? 'Cola virtual activada' : 'Cola virtual desactivada')}
            trackColor={{ true: color.acento, false: color.superficie3 }}
            thumbColor={color.blanco}
            accessibilityLabel="Cola virtual"
          />
        </Fila>
        {evento.cola_activa && (
          <Fila gap={espacio.s} style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Campo etiqueta="Personas que entran por minuto" value={ritmo} onChangeText={setRitmo} keyboardType="number-pad" />
            </View>
            <Boton
              v="secundario"
              bloque={false}
              cargando={ocupado === 'ritmo'}
              deshabilitado={!(Number.parseInt(ritmo, 10) >= 1)}
              onPress={() => void guardar('ritmo', { cola_ritmo: Number.parseInt(ritmo, 10) }, 'Ritmo de la cola actualizado')}
            >
              Guardar
            </Boton>
          </Fila>
        )}
      </View>

      <View style={[s.tarjeta, { marginTop: espacio.s }]}>
        <Fila gap={espacio.m}>
          <Icono n="shield-checkmark-outline" c={color.texto2} />
          <View style={{ flex: 1 }}>
            <T v="cuerpoFuerte">Registro de fans verificados</T>
            <T v="nota" c="texto2">
              Los fans se inscriben y sorteas entre ellos el acceso a la preventa (tipos de entrada con código).
            </T>
          </View>
          <Switch
            value={evento.registro_fan_activo}
            disabled={!editable || ocupado !== null}
            onValueChange={(v) => void guardar('fans', { registro_fan_activo: v }, v ? 'Registro de fans abierto' : 'Registro de fans cerrado')}
            trackColor={{ true: color.acento, false: color.superficie3 }}
            thumbColor={color.blanco}
            accessibilityLabel="Registro de fans"
          />
        </Fila>
        {fans && (
          <Fila gap={espacio.l}>
            <T v="nota" c="texto2">
              {fans.inscrito} inscritos
            </T>
            <T v="nota" c="acento">
              {fans.seleccionado} seleccionados
            </T>
            <T v="nota" c="texto3">
              {fans.no_seleccionado} sin plaza
            </T>
          </Fila>
        )}
        {editable && (fans?.inscrito ?? 0) > 0 && (
          <Fila gap={espacio.s} style={{ alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Campo etiqueta="Plazas a sortear" value={plazas} onChangeText={setPlazas} keyboardType="number-pad" placeholder={String(fans?.inscrito ?? '')} />
            </View>
            <Boton bloque={false} icono="shuffle" cargando={ocupado === 'sorteo'} deshabilitado={!(Number.parseInt(plazas, 10) >= 1)} onPress={() => void sortear()}>
              Sortear
            </Boton>
          </Fila>
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  tarjeta: { gap: espacio.m, padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
});
