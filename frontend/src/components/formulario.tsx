import { useState, type ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { color, espacio, radio, tipo } from '../theme';
import { Icono, Pulsable, T, type NombreIcono } from './base';

type PropsCampo = ComponentProps<typeof TextInput> & { etiqueta: string; error?: string | null; icono?: NombreIcono; ayuda?: string };

export function Campo({ etiqueta, error, icono, ayuda, secureTextEntry, style, ...props }: PropsCampo) {
  const [foco, setFoco] = useState(false);
  const [visible, setVisible] = useState(false);
  const borde = error ? color.peligro : foco ? color.acento : color.borde;
  return (
    <View style={{ gap: 6 }}>
      <T v="nota" c="texto2">
        {etiqueta}
      </T>
      <View style={[s.caja, { borderColor: borde }, props.multiline && { alignItems: 'flex-start', paddingVertical: 12 }]}>
        {icono && <Icono n={icono} tam={18} c={foco ? color.acento : color.texto3} />}
        <TextInput
          placeholderTextColor={color.texto3}
          selectionColor={color.acento}
          {...props}
          secureTextEntry={secureTextEntry && !visible}
          accessibilityLabel={etiqueta}
          onFocus={(e) => {
            setFoco(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            props.onBlur?.(e);
          }}
          style={[s.entrada, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
        />
        {secureTextEntry && (
          <Pulsable onPress={() => setVisible((v) => !v)} accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} hitSlop={10}>
            <Icono n={visible ? 'eye-off-outline' : 'eye-outline'} tam={20} c={color.texto3} />
          </Pulsable>
        )}
      </View>
      {error ? (
        <T v="nota" c="peligro">
          {error}
        </T>
      ) : ayuda ? (
        <T v="nota" c="texto3">
          {ayuda}
        </T>
      ) : null}
    </View>
  );
}

/** Selector de cantidad − n + */
export function Contador({ valor, min = 0, max, onCambio }: { valor: number; min?: number; max: number; onCambio: (n: number) => void }) {
  return (
    <View style={s.contador}>
      <Pulsable onPress={() => onCambio(valor - 1)} disabled={valor <= min} accessibilityLabel="Quitar una" style={s.contadorBoton}>
        <Icono n="remove" tam={18} c={color.texto} />
      </Pulsable>
      <Text style={[tipo.cabecera, { color: color.texto, minWidth: 22, textAlign: 'center', fontVariant: ['tabular-nums'] }]} accessibilityLiveRegion="polite">
        {valor}
      </Text>
      <Pulsable
        onPress={() => onCambio(valor + 1)}
        disabled={valor >= max}
        accessibilityLabel="Añadir una"
        style={[s.contadorBoton, valor < max && { backgroundColor: color.acento }]}
      >
        <Icono n="add" tam={18} c={valor < max ? color.acentoTexto : color.texto} />
      </Pulsable>
    </View>
  );
}

const s = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, minHeight: 52, paddingHorizontal: 14, borderRadius: radio.m, borderWidth: 1.5, backgroundColor: color.superficie },
  entrada: { flex: 1, ...tipo.cuerpo, color: color.texto, paddingVertical: 12, outlineStyle: 'none' } as object,
  contador: { flexDirection: 'row', alignItems: 'center', gap: espacio.m },
  contadorBoton: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.superficie2, alignItems: 'center', justifyContent: 'center' },
});
