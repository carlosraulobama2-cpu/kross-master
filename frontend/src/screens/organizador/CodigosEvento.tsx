import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAviso } from '../../components/aviso';
import { Boton, Chip, Fila, Icono, Insignia, Pulsable, T } from '../../components/base';
import { Campo } from '../../components/formulario';
import { TituloSeccion } from '../../components/pantalla';
import { api, mensajeDe } from '../../lib/api';
import { useCodigosEvento } from '../../lib/consultas';
import { precioExacto } from '../../lib/formato';
import { color, espacio, radio } from '../../theme';

/** Códigos de descuento de un evento: crear, pausar y ver usos. */
export function CodigosEvento({ eventoId, editable }: { eventoId: string; editable: boolean }) {
  const { data: codigos } = useCodigosEvento(eventoId);
  const qc = useQueryClient();
  const avisar = useAviso();
  const [creando, setCreando] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState<'porcentaje' | 'fijo'>('porcentaje');
  const [valor, setValor] = useState('');
  const [usos, setUsos] = useState('');
  const [ocupado, setOcupado] = useState<string | null>(null);

  const recargar = () => qc.invalidateQueries({ predicate: (q) => q.queryKey.includes('codigos') });
  const valorNum = tipo === 'porcentaje' ? Number.parseInt(valor, 10) : Math.round(Number(valor.replace(',', '.')) * 100);
  const valido = /^[A-Z0-9_-]{3,30}$/.test(codigo) && valorNum > 0 && (tipo === 'fijo' || valorNum <= 100);

  async function crear() {
    setOcupado('crear');
    try {
      await api(`/organizador/eventos/${eventoId}/codigos`, {
        method: 'POST',
        body: { codigo, tipo, valor: valorNum, usos_max: usos.trim() ? Number.parseInt(usos, 10) : null },
      });
      avisar(`Código ${codigo} creado`, 'exito');
      setCreando(false);
      setCodigo('');
      setValor('');
      setUsos('');
      await recargar();
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setOcupado(null);
    }
  }

  async function alternar(id: string, activo: boolean) {
    setOcupado(id);
    try {
      await api(`/organizador/eventos/${eventoId}/codigos/${id}`, { method: 'PATCH', body: { activo } });
      await recargar();
    } catch (e) {
      avisar(mensajeDe(e), 'error');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <TituloSeccion titulo="Códigos de descuento" />
      <View style={{ gap: espacio.s }}>
        {(codigos ?? []).map((c) => (
          <Fila key={c.id} gap={espacio.m} style={[s.fila, !c.activo && { opacity: 0.55 }]}>
            <View style={s.icono}>
              <Icono n="pricetag" c={color.acento} />
            </View>
            <View style={{ flex: 1 }}>
              <Fila gap={espacio.s}>
                <T v="cuerpoFuerte" style={{ letterSpacing: 1 }}>
                  {c.codigo}
                </T>
                <Insignia texto={c.tipo === 'porcentaje' ? `−${c.valor} %` : `−${precioExacto(c.valor)}`} tono="acento" />
              </Fila>
              <T v="nota" c="texto2">
                {c.usos} uso{c.usos === 1 ? '' : 's'}
                {c.usos_max ? ` de ${c.usos_max}` : ''}
                {c.activo ? '' : ' · pausado'}
              </T>
            </View>
            {editable && (
              <Boton v="secundario" pequeno bloque={false} cargando={ocupado === c.id} onPress={() => void alternar(c.id, !c.activo)}>
                {c.activo ? 'Pausar' : 'Activar'}
              </Boton>
            )}
          </Fila>
        ))}
        {editable &&
          (creando ? (
            <View style={[s.fila, { flexDirection: 'column', alignItems: 'stretch', gap: espacio.m }]}>
              <Campo etiqueta="Código" value={codigo} onChangeText={(t) => setCodigo(t.toUpperCase().replace(/\s/g, ''))} placeholder="VERANO20" autoCapitalize="characters" />
              <Fila gap={espacio.s}>
                <Chip texto="Porcentaje" activo={tipo === 'porcentaje'} onPress={() => setTipo('porcentaje')} />
                <Chip texto="Importe fijo" activo={tipo === 'fijo'} onPress={() => setTipo('fijo')} />
              </Fila>
              <Fila gap={espacio.s} style={{ alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Campo etiqueta={tipo === 'porcentaje' ? 'Descuento (%)' : 'Descuento (€ por pedido)'} value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder={tipo === 'porcentaje' ? '20' : '5'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Campo etiqueta="Usos máximos" value={usos} onChangeText={setUsos} keyboardType="number-pad" placeholder="Sin límite" />
                </View>
              </Fila>
              <Fila gap={espacio.s}>
                <Boton v="secundario" onPress={() => setCreando(false)} style={{ flex: 1 }}>
                  Cancelar
                </Boton>
                <Boton onPress={() => void crear()} deshabilitado={!valido} cargando={ocupado === 'crear'} style={{ flex: 1 }}>
                  Crear código
                </Boton>
              </Fila>
            </View>
          ) : (
            <Pulsable onPress={() => setCreando(true)} style={s.anadir} escala={0.98}>
              <Icono n="add-circle-outline" c={color.acento} />
              <T v="cuerpoFuerte" c="acento">
                Nuevo código de descuento
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
