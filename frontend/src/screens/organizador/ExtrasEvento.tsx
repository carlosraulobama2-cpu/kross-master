import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Chip, Fila, Icono, Pulsable, T, type NombreIcono } from '../../components/base';
import { Campo } from '../../components/formulario';
import { TituloSeccion } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { precio } from '../../lib/formato';
import type { ExtraOrganizador, TipoExtra } from '../../lib/tipos';
import { color, espacio, radio } from '../../theme';

export const TIPOS_EXTRA: { id: TipoExtra; texto: string; icono: NombreIcono }[] = [
  { id: 'parking', texto: 'Parking', icono: 'car-outline' },
  { id: 'merch', texto: 'Merch', icono: 'shirt-outline' },
  { id: 'vip', texto: 'VIP', icono: 'star-outline' },
  { id: 'comida', texto: 'Comida', icono: 'fast-food-outline' },
  { id: 'otro', texto: 'Otro', icono: 'add-circle-outline' },
];

/** Extras que se venden con la entrada: parking, merch, upgrades VIP… */
export function ExtrasEvento({ eventoId, editable }: { eventoId: string; editable: boolean }) {
  const qc = useQueryClient();
  const avisar = useAviso();
  const { data: extras } = useQuery({
    queryKey: ['yo', 'organizador', 'extras', eventoId],
    queryFn: () => api<{ extras: ExtraOrganizador[] }>(`/organizador/eventos/${eventoId}/extras`).then((r) => r.extras),
  });
  const [creando, setCreando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoExtra>('parking');
  const [importe, setImporte] = useState('');
  const [stock, setStock] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const precioCent = Math.round(Number(importe.replace(',', '.')) * 100);
  const stockNum = Number.parseInt(stock, 10);
  const valido = nombre.trim().length >= 2 && Number.isFinite(precioCent) && precioCent >= 0 && importe.trim() !== '' && stockNum > 0;
  const recargar = () => qc.invalidateQueries({ queryKey: ['yo', 'organizador', 'extras', eventoId] });

  async function crear() {
    setOcupado('crear');
    try {
      await api(`/organizador/eventos/${eventoId}/extras`, { method: 'POST', body: { nombre: nombre.trim(), tipo, precio_centimos: precioCent, stock_total: stockNum } });
      avisar(`${nombre.trim()} añadido`, 'exito');
      setCreando(false);
      setNombre('');
      setImporte('');
      setStock('');
      await recargar();
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setOcupado(null);
    }
  }

  async function alternar(x: ExtraOrganizador) {
    setOcupado(x.id);
    try {
      await api(`/organizador/eventos/${eventoId}/extras/${x.id}`, { method: 'PATCH', body: { activo: !x.activo } });
      await recargar();
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <TituloSeccion titulo="Extras" />
      <View style={{ gap: espacio.s }}>
        {(extras ?? []).map((x) => (
          <Fila key={x.id} gap={espacio.m} style={[s.fila, !x.activo && { opacity: 0.55 }]}>
            <View style={s.icono}>
              <Icono n={TIPOS_EXTRA.find((t) => t.id === x.tipo)?.icono ?? 'add-circle-outline'} c={color.acento} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="cuerpoFuerte">{x.nombre}</T>
              <T v="nota" c="texto2">
                {precio(x.precio_centimos)} · {x.stock_vendido}/{x.stock_total} vendidos{x.activo ? '' : ' · pausado'}
              </T>
            </View>
            {editable && (
              <Boton v="secundario" pequeno bloque={false} cargando={ocupado === x.id} onPress={() => void alternar(x)}>
                {x.activo ? 'Pausar' : 'Activar'}
              </Boton>
            )}
          </Fila>
        ))}
        {editable &&
          (creando ? (
            <View style={[s.fila, { gap: espacio.m }]}>
              <Fila gap={espacio.s} style={{ flexWrap: 'wrap' }}>
                {TIPOS_EXTRA.map((t) => (
                  <Chip key={t.id} texto={t.texto} icono={t.icono} activo={tipo === t.id} onPress={() => setTipo(t.id)} />
                ))}
              </Fila>
              <Campo etiqueta="Nombre" value={nombre} onChangeText={setNombre} placeholder="Parking oficial, camiseta…" />
              <Fila gap={espacio.s} style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Campo etiqueta="Precio (€)" value={importe} onChangeText={setImporte} keyboardType="decimal-pad" placeholder="15" />
                </View>
                <View style={{ flex: 1 }}>
                  <Campo etiqueta="Unidades" value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="200" />
                </View>
              </Fila>
              <Fila gap={espacio.s}>
                <Boton v="secundario" onPress={() => setCreando(false)} style={{ flex: 1 }}>
                  Cancelar
                </Boton>
                <Boton onPress={() => void crear()} deshabilitado={!valido} cargando={ocupado === 'crear'} style={{ flex: 1 }}>
                  Añadir extra
                </Boton>
              </Fila>
            </View>
          ) : (
            <Pulsable onPress={() => setCreando(true)} style={s.anadir} escala={0.98}>
              <Icono n="add-circle-outline" c={color.acento} />
              <T v="cuerpoFuerte" c="acento">
                Nuevo extra (parking, merch, VIP…)
              </T>
            </Pulsable>
          ))}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  fila: { padding: espacio.l, borderRadius: radio.l, backgroundColor: color.superficie, borderWidth: 1, borderColor: color.borde },
  icono: { width: 40, height: 40, borderRadius: radio.m, backgroundColor: color.acentoSuave, alignItems: 'center', justifyContent: 'center' },
  anadir: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espacio.s, minHeight: 56, borderRadius: radio.l, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.bordeFuerte },
});
